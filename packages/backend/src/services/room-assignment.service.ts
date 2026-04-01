// Room Assignment Algorithms

interface RoomInput {
  _id: string;
  capacity: number;
  name: string;
  panelists?: { name: string; expertise: string[] }[];
}

interface StudentInput {
  _id: string;
  branch?: string;
  name?: string;
}

interface AssignmentResult {
  roomId: string;
  studentIds: string[];
  matchScore: number;
  matchReason: string;
}

/**
 * ALGORITHM 1 — Random Assignment (Aptitude round)
 * Fisher-Yates shuffle then round-robin fill
 */
export function randomAssign(
  studentIds: string[],
  rooms: RoomInput[]
): AssignmentResult[] {
  // Fisher-Yates shuffle
  const shuffled = [...studentIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: AssignmentResult[] = rooms.map(r => ({
    roomId: r._id.toString(),
    studentIds: [],
    matchScore: 50,
    matchReason: 'Random assignment'
  }));

  // True Round-Robin distribution to ensure even load balancing
  let sIndex = 0;
  while (sIndex < shuffled.length) {
    let assignedThisPass = false;
    for (let rIndex = 0; rIndex < rooms.length; rIndex++) {
      if (sIndex >= shuffled.length) break;
      
      // If this room still has capacity, assign the next student
      if (assignments[rIndex].studentIds.length < rooms[rIndex].capacity) {
        assignments[rIndex].studentIds.push(shuffled[sIndex]);
        sIndex++;
        assignedThisPass = true;
      }
    }
    // If we looped through all rooms and nobody took a student, it means all rooms are full
    if (!assignedThisPass) break;
  }

  return assignments;
}

/**
 * ALGORITHM 2 — AI-Suggested Assignment (GD / Interview rounds)
 * Matches student branches to panelist expertise
 */
export function aiSuggestAssign(
  students: StudentInput[],
  rooms: RoomInput[]
): AssignmentResult[] {
  const assignments: AssignmentResult[] = rooms.map(r => ({
    roomId: r._id.toString(),
    studentIds: [],
    matchScore: 0,
    matchReason: ''
  }));

  // Group students by branch
  const branchGroups = new Map<string, string[]>();
  for (const s of students) {
    const branch = (s.branch || 'OTHER').toUpperCase();
    if (!branchGroups.has(branch)) branchGroups.set(branch, []);
    branchGroups.get(branch)!.push(s._id.toString());
  }

  const branchMap: Record<string, string[]> = {
    'CSE': ['COMPUTER SCIENCE', 'SOFTWARE', 'CS', 'IT', 'AI', 'ML', 'DATA'],
    'ISE': ['INFORMATION SCIENCE', 'IT', 'SOFTWARE', 'IS'],
    'ECE': ['ELECTRONICS', 'HARDWARE', 'VLSI', 'EMBEDDED', 'COMMUNICATION'],
    'ME': ['MECHANICAL', 'MANUFACTURING', 'AUTOMOTIVE', 'DESIGN'],
    'CV': ['CIVIL', 'CONSTRUCTION', 'STRUCTURAL'],
    'EEE': ['ELECTRICAL', 'POWER', 'ELECTRONICS'],
    'AI': ['AI', 'ML', 'MACHINE LEARNING', 'DATA SCIENCE', 'ARTIFICIAL'],
  };

  function roomScore(room: RoomInput, branch: string): number {
    const expertise = (room.panelists || [])
      .flatMap(p => p.expertise || [])
      .map(e => e.toUpperCase());
    const keywords = branchMap[branch] || [branch];
    return expertise.filter(e => keywords.some(k => e.includes(k))).length;
  }

  const usedCapacity = new Map<string, number>(rooms.map(r => [r._id.toString(), 0]));

  for (const [branch, studentIds] of branchGroups) {
    const scored = rooms
      .map(r => ({ room: r, score: roomScore(r, branch) }))
      .sort((a, b) => b.score - a.score);

    let remaining = [...studentIds];

    for (const { room, score } of scored) {
      if (remaining.length === 0) break;
      const roomId = room._id.toString();
      const available = room.capacity - (usedCapacity.get(roomId) || 0);
      if (available <= 0) continue;

      const toAssign = remaining.splice(0, available);
      const assignment = assignments.find(a => a.roomId === roomId)!;
      assignment.studentIds.push(...toAssign);
      usedCapacity.set(roomId, (usedCapacity.get(roomId) || 0) + toAssign.length);

      if (assignment.matchScore === 0) {
        assignment.matchScore = score > 0 ? Math.min(100, score * 25 + 50) : 30;
        assignment.matchReason = score > 0
          ? `${branch} students matched to ${room.panelists?.[0]?.name || 'panelist'} expertise`
          : `${branch} students assigned to available room`;
      }
    }
  }

  return assignments;
}

export function calcOverallMatchQuality(assignments: AssignmentResult[]): number {
  const total = assignments.reduce((s, a) => s + a.studentIds.length, 0);
  if (total === 0) return 0;
  const weightedScore = assignments.reduce((s, a) => s + (a.matchScore * a.studentIds.length), 0);
  return Math.round(weightedScore / total);
}
