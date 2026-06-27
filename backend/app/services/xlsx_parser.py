import openpyxl
from io import BytesIO
from typing import List, Dict

async def parse_xlsx_file(file_content: bytes) -> List[Dict]:
    """
    Parses an uploaded .xlsx file directly from memory.
    Assumes the first row is headers.
    Returns a list of dictionaries where keys are column headers.
    """
    workbook = openpyxl.load_workbook(filename=BytesIO(file_content), data_only=True)
    sheet = workbook.active
    
    data = []
    headers = []
    
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
        if row_idx == 0:
            # First row is headers
            headers = [str(cell).strip() if cell else f"Column_{i}" for i, cell in enumerate(row)]
        else:
            # Data rows
            row_data = {}
            is_empty = True
            for col_idx, cell_value in enumerate(row):
                if col_idx < len(headers):
                    row_data[headers[col_idx]] = cell_value
                    if cell_value is not None and str(cell_value).strip() != "":
                        is_empty = False
            
            if not is_empty:
                data.append(row_data)
                
    return data

from app.models.student import StudentModel
from app.models.drive import DriveModel
from fastapi import BackgroundTasks
import uuid
from app.services.notification_service import NotificationService

async def process_student_shortlist(file_content: bytes, drive: DriveModel, background_tasks: BackgroundTasks):
    """
    Takes an XLSX of shortlisted students, parses it, 
    and updates their status in the database.
    """
    # 1. Parse the XLSX file
    parsed_data = await parse_xlsx_file(file_content)
    
    # 2. Extract emails from the uploaded XLSX
    emails_to_shortlist = []
    for row in parsed_data:
        email = row.get("Email", row.get("Email ID", "")).strip()
        if email:
            emails_to_shortlist.append(email)
            
    if not emails_to_shortlist:
        return {"status": "error", "message": "No valid emails found in the uploaded file."}

    # 3. Find and update existing students in the database
    students_to_update = await StudentModel.find(
        {"drive_id": str(drive.id), "email": {"$in": emails_to_shortlist}}
    ).to_list()
    
    # Update their status to 'shortlisted'
    for student in students_to_update:
        student.status = "shortlisted"
        await student.save()
    
    # 4. Trigger NotificationService to send Call Letters and WhatsApp
    if students_to_update:
        background_tasks.add_task(NotificationService.process_shortlist_notifications, students_to_update, drive)
    
    return {
        "status": "success",
        "students_added": len(students_to_update),
        "message": f"{len(students_to_update)} students successfully shortlisted and notified."
    }

from app.models.room import RoomModel

async def process_room_upload(file_content: bytes, drive_id: str):
    """
    Takes an XLSX of rooms, parses it, and inserts them into the database.
    """
    parsed_data = await parse_xlsx_file(file_content)
    
    rooms_to_insert = []
    for row in parsed_data:
        name = row.get("Room Name", row.get("Name", row.get("Room", "")))
        if not name:
            continue # Skip rows without a room name
            
        capacity = row.get("Capacity", row.get("Seats", 60))
        try:
            capacity = int(capacity)
        except (ValueError, TypeError):
            capacity = 60
            
        purpose = row.get("Purpose", row.get("Usage", "General"))
        block = str(row.get("Block", "")) if row.get("Block") else None
        floor = str(row.get("Floor", "")) if row.get("Floor") else None
        
        room = RoomModel(
            drive_id=drive_id,
            name=str(name),
            capacity=capacity,
            purpose=str(purpose),
            block=block,
            floor=floor,
            current_occupancy=0,
            is_locked=False
        )
        rooms_to_insert.append(room)
        
    if rooms_to_insert:
        await RoomModel.insert_many(rooms_to_insert)
        
    return {
        "status": "success",
        "rooms_added": len(rooms_to_insert),
        "message": f"Successfully parsed and added {len(rooms_to_insert)} rooms."
    }
