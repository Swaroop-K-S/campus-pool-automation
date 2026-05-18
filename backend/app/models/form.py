from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class FormField(BaseModel):
    name: str # The internal key, e.g. "cgpa", "resume"
    label: str # The display label, e.g. "Enter your CGPA"
    type: str # text, number, select, file, email, tel
    required: bool = False
    options: Optional[List[str]] = None # For 'select' type, e.g. ["CSE", "ISE", "ECE"]
    depends_on_field: Optional[str] = None # For conditional logic, the internal name of the parent field
    depends_on_value: Optional[str] = None # The value the parent field must have for this field to show

class FormSchemaModel(Document):
    drive_id: str
    fields: List[FormField] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "form_schemas"
