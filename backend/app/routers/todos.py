from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.services.supabase_client import get_supabase
from app.services.auth_service import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/todos", tags=["todos"])

class TodoCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TodoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

@router.get("/")
async def get_todos(user: dict = Depends(get_current_user)):
    """Fetch all todos for the authenticated user"""
    try:
        supabase = get_supabase()
        user_id = user.get("sub")  # Supabase JWT has 'sub' claim with user ID
        
        response = supabase.table("todos").select("*").eq("user_id", user_id).execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_todo(todo: TodoCreate, user: dict = Depends(get_current_user)):
    """Create a new todo for the authenticated user"""
    try:
        supabase = get_supabase()
        user_id = user.get("sub")
        
        payload = {"name": todo.name, "user_id": user_id}
        if todo.description:
            payload["description"] = todo.description
        
        response = supabase.table("todos").insert(payload).execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{todo_id}")
async def get_todo(todo_id: int, user: dict = Depends(get_current_user)):
    """Fetch a specific todo (user can only access their own)"""
    try:
        supabase = get_supabase()
        user_id = user.get("sub")
        
        response = supabase.table("todos").select("*").eq("id", todo_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Todo not found")
        return {"data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{todo_id}")
async def update_todo(todo_id: int, todo: TodoUpdate, user: dict = Depends(get_current_user)):
    """Update a todo (user can only update their own)"""
    try:
        supabase = get_supabase()
        user_id = user.get("sub")
        
        # Verify ownership first
        check = supabase.table("todos").select("id").eq("id", todo_id).eq("user_id", user_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        # Build update payload
        payload = {}
        if todo.name is not None:
            payload["name"] = todo.name
        if todo.description is not None:
            payload["description"] = todo.description
        if todo.completed is not None:
            payload["completed"] = todo.completed
        
        response = supabase.table("todos").update(payload).eq("id", todo_id).execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{todo_id}")
async def delete_todo(todo_id: int, user: dict = Depends(get_current_user)):
    """Delete a todo (user can only delete their own)"""
    try:
        supabase = get_supabase()
        user_id = user.get("sub")
        
        # Verify ownership
        check = supabase.table("todos").select("id").eq("id", todo_id).eq("user_id", user_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        supabase.table("todos").delete().eq("id", todo_id).execute()
        return {"message": "Todo deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
