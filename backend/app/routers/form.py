from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

from app.models.form import FormSchemaModel, FormField

router = APIRouter(prefix="/drives", tags=["Forms"])

class CreateFormRequest(BaseModel):
    fields: List[FormField]

@router.post("/{drive_id}/form", status_code=status.HTTP_200_OK)
async def save_form_schema(drive_id: str, payload: CreateFormRequest):
    """Create or update the dynamic registration form schema for a drive"""
    existing_schema = await FormSchemaModel.find_one(FormSchemaModel.drive_id == drive_id)
    
    if existing_schema:
        existing_schema.fields = payload.fields
        await existing_schema.save()
        return existing_schema
    else:
        new_schema = FormSchemaModel(
            drive_id=drive_id,
            fields=payload.fields
        )
        await new_schema.insert()
        return new_schema

@router.get("/{drive_id}/form")
async def get_form_schema(drive_id: str):
    """Get the dynamic form schema. Used by the public student registration portal."""
    schema = await FormSchemaModel.find_one(FormSchemaModel.drive_id == drive_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Form schema not found for this drive.")
    
    return schema
