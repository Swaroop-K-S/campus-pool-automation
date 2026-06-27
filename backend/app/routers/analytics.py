from fastapi import APIRouter
from app.models.student import StudentModel
from app.models.drive import DriveModel
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_analytics():
    """
    Returns aggregated analytics for the Admin Overview dashboard:
    - Funnel metrics (Registered -> Shortlisted -> Present -> Selected)
    - Branch-wise placement distribution
    - Registration trends over the last 7 days
    """
    students = await StudentModel.find_all().to_list()
    
    # 1. Funnel Metrics
    funnel = {
        "registered": 0,
        "shortlisted": 0,
        "present": 0,
        "selected": 0
    }
    
    # 2. Branch-wise Placement (Assuming branch is stored in custom_data['branch'])
    branch_distribution = defaultdict(int)
    
    # 3. Registration Trends (Last 7 Days)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    trend_data = { (today - timedelta(days=i)).strftime('%a'): 0 for i in range(6, -1, -1) }
    
    for s in students:
        # Funnel
        funnel["registered"] += 1
        if s.status in ["shortlisted", "present", "selected", "passed", "rejected"]:
            funnel["shortlisted"] += 1
        if s.status in ["present", "selected", "passed", "rejected"]:
            funnel["present"] += 1
        if s.status == "selected":
            funnel["selected"] += 1
            
            # Branch distribution
            branch = s.custom_data.get("branch", "Unknown") if s.custom_data else "Unknown"
            if not branch:
                branch = "Unknown"
            branch = str(branch).strip().upper()
            branch_distribution[branch] += 1
            
        # Trends
        if s.created_at:
            reg_date = s.created_at.replace(hour=0, minute=0, second=0, microsecond=0)
            day_name = reg_date.strftime('%a')
            if day_name in trend_data and reg_date >= (today - timedelta(days=6)):
                trend_data[day_name] += 1

    # Format trends for Recharts
    trends_list = [{"name": day, "registrations": count} for day, count in trend_data.items()]
    
    # Format branch distribution for Recharts
    branch_list = [{"name": b, "value": c} for b, c in branch_distribution.items()]
    
    return {
        "funnel": funnel,
        "branch_distribution": branch_list,
        "trends": trends_list
    }
