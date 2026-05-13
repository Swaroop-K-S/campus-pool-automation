import logging
from typing import List
from app.models.student import StudentModel
from app.models.room import RoomModel
from app.models.drive import RoundModel

logger = logging.getLogger(__name__)

class LogisticsEngine:
    """
    The core engine responsible for routing students to rooms based on 
    venue capacities and round types (The "Butter").
    """
    
    def __init__(self, drive_id: str):
        self.drive_id = drive_id

    async def allocate_students_to_round(self, round_id: str):
        """
        Main entry point for allocating students to a specific round.
        """
        logger.info(f"Starting allocation for Drive {self.drive_id}, Round {round_id}")
        
        # 1. Fetch the round details to know the type (Aptitude vs GD)
        target_round = await RoundModel.get(round_id)
        if not target_round:
            raise ValueError("Round not found")

        # 2. Fetch all students who are currently 'present' or 'passed' the previous round
        # eligible_students = await StudentModel.find({"drive_id": self.drive_id, "status": "present"}).to_list()
        
        # 3. Fetch all available rooms for this round
        # available_rooms = await RoomModel.find({"round_id": round_id}).to_list()
        
        # 4. Route to the correct allocation algorithm based on round_type
        if target_round.round_type in ["aptitude", "seminar", "technical"]:
            await self._allocate_capacity_fill(target_round)
        elif target_round.round_type == "gd":
            await self._allocate_group_cluster(target_round)
            
        # 5. Broadcast new assignments via WebSockets
        # await websocket_manager.broadcast_to_drive(self.drive_id, "assignments_updated")
        
        return True

    async def _allocate_capacity_fill(self, target_round: RoundModel):
        """
        Algorithm for Aptitude/Seminar: 
        Fills Room A up to exactly its capacity, then moves to Room B.
        """
        # Placeholder for capacity-fill algorithm
        logger.info(f"Running Capacity-Fill algorithm for {target_round.name}")
        pass

    async def _allocate_group_cluster(self, target_round: RoundModel):
        """
        Algorithm for Group Discussions:
        Divides students into evenly sized clusters based on room availability.
        """
        # Placeholder for group-cluster algorithm
        logger.info(f"Running Group-Cluster algorithm for {target_round.name}")
        pass
