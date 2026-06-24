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
    
    # 2. Extract and create Student models
    students_to_insert = []
    for row in parsed_data:
        # Try to find standard columns, fallback to empty string if missing
        full_name = row.get("Name", row.get("Full Name", row.get("Student Name", "Unknown")))
        email = row.get("Email", row.get("Email ID", "unknown@example.com"))
        phone = str(row.get("Phone", row.get("Mobile", row.get("Contact", "0000000000"))))
        
        # Generate a unique ID (e.g. USN or UUID)
        unique_id = str(row.get("USN", row.get("Roll Number", row.get("ID", str(uuid.uuid4())[:8]))))
        
        student = StudentModel(
            drive_id=str(drive.id),
            unique_id=unique_id,
            full_name=full_name,
            email=email,
            phone=phone,
            status="shortlisted"
        )
        students_to_insert.append(student)
        
    # 3. Bulk insert to MongoDB via Beanie
    if students_to_insert:
        await StudentModel.insert_many(students_to_insert)
    
    # 4. Trigger NotificationService to send Call Letters and WhatsApp
    if students_to_insert:
        background_tasks.add_task(NotificationService.process_shortlist_notifications, students_to_insert, drive)
    
    return {
        "status": "success",
        "students_added": len(students_to_insert),
        "message": f"{len(students_to_insert)} students shortlisted successfully."
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
