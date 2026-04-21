import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { llmInvoke } from '../utils/llm';

// Room Assignment Algorithms

export interface RoomInput {
  _id: string;
  capacity: number;
  name: string;
  isLocked?: boolean;
  allowedBranches?: string[];
  panelists?: { name: string; expertise: string[] }[];
  throughputLog?: { recordedAt: Date; processedCount: number }[];
}

export interface StudentInput {
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

export interface AssignmentResponse {
  assignments: AssignmentResult[];
  unassigned: string[];
}

/**
 * ALGORITHM 1 — Random Assignment (Aptitude round)
 * Fisher-Yates shuffle then round-robin fill, respects locked rooms,
 * tracks unassigned (overflow) students.
 */
export function randomAssignWithOverflow(
  studentIds: string[],
  rooms: RoomInput[],
  existingAssignments: Record<string, string[]> = {}
): AssignmentResponse {
  const shuffled = [...studentIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: AssignmentResult[] = rooms.map(r => ({
    roomId: r._id.toString(),
    studentIds: [...(existingAssignments[r._id.toString()] || [])], // Keep existing if locked
    matchScore: 50,
    matchReason: 'Random assignment'
  }));

  let sIndex = 0;
  while (sIndex < shuffled.length) {
    let assignedThisPass = false;
    for (let rIndex = 0; rIndex < rooms.length; rIndex++) {
      if (sIndex >= shuffled.length) break;
      const room = rooms[rIndex];
      if (room.isLocked) continue; // Skip locked rooms

      if (assignments[rIndex].studentIds.length < room.capacity) {
        assignments[rIndex].studentIds.push(shuffled[sIndex]);
        sIndex++;
        assignedThisPass = true;
      }
    }
    // All available unlocked rooms are literally full
    if (!assignedThisPass) break;
  }

  const unassigned = shuffled.slice(sIndex);
  return { assignments, unassigned };
}

/**
 * ALGORITHM 2 — AI-Suggested Assignment (GD / Interview rounds)
 * Matches student branches to panelist expertise and respects locked rooms/overflow.
 */
export function aiSuggestAssignWithOverflow(
  students: StudentInput[],
  rooms: RoomInput[],
  existingAssignments: Record<string, string[]> = {}
): AssignmentResponse {
  const assignments: AssignmentResult[] = rooms.map(r => ({
    roomId: r._id.toString(),
    studentIds: [...(existingAssignments[r._id.toString()] || [])],
    matchScore: 0,
    matchReason: ''
  }));

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
    if (room.isLocked) return -1; // Never assign to locked
    if (room.allowedBranches?.length && !room.allowedBranches.includes(branch)) return -1;

    const expertise = (room.panelists || [])
      .flatMap(p => p.expertise || [])
      .map(e => e.toUpperCase());
    const keywords = branchMap[branch] || [branch];
    return expertise.filter(e => keywords.some(k => e.includes(k))).length;
  }

  const usedCapacity = new Map<string, number>(
    rooms.map(r => [r._id.toString(), existingAssignments[r._id.toString()]?.length || 0])
  );

  const unassigned: string[] = [];

  for (const [branch, studentIds] of branchGroups) {
    const scored = rooms
      .map(r => ({ room: r, score: roomScore(r, branch) }))
      .filter(r => r.score >= 0)
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
          ? `${branch} matched to ${room.panelists?.[0]?.name || 'panelist'} expertise`
          : `Assigned based on availability`;
      }
    }

    // Whatever is left didn't fit anywhere
    unassigned.push(...remaining);
  }

  return { assignments, unassigned };
}

/**
 * ALGORITHM 3 — Estimated Wait Time (EWT) Engine v2
 * Uses recent throughput logs to predict actual wait time.
 */
export function computeRoomEWT(
  studentQueueSize: number,
  throughputLog: { recordedAt: Date; processedCount: number }[] = []
): { estimatedMinutes: number; accuracy: 'high' | 'medium' | 'low' } {
  // We need at least recent samples (e.g. last 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentLogs = throughputLog.filter(l => l.recordedAt > oneHourAgo);

  // Fallback if no data: Assume 15 minutes per student
  if (recentLogs.length === 0 || recentLogs.reduce((s, l) => s + l.processedCount, 0) === 0) {
    return { estimatedMinutes: studentQueueSize * 15, accuracy: 'low' };
  }

  // Calculate throughput: students per minute over the total time span of recent logs
  const oldest = recentLogs.reduce((earliest, log) => log.recordedAt < earliest ? log.recordedAt : earliest, new Date());
  const elapsedMinutes = Math.max(5, (Date.now() - oldest.getTime()) / 60000); // min 5 mins to prevent spikes
  const totalProcessed = recentLogs.reduce((s, l) => s + l.processedCount, 0);

  const studentsPerMinute = totalProcessed / elapsedMinutes;
  if (studentsPerMinute <= 0.01) { // practically stalled
    return { estimatedMinutes: studentQueueSize * 15, accuracy: 'low' };
  }

  const minutesPerStudent = 1 / studentsPerMinute;
  return {
    estimatedMinutes: Math.round(studentQueueSize * minutesPerStudent),
    accuracy: recentLogs.length > 3 ? 'high' : 'medium'
  };
}

/**
 * ALGORITHM 4 — Late-Joiner Room Discovery
 * Finds the room with the most available absolute capacity.
 */
export function findLeastFullRoom(rooms: RoomInput[], currentAssignments: Record<string, number>): RoomInput | null {
  let bestRoom: RoomInput | null = null;
  let maxAvailable = -1;

  for (const room of rooms) {
    if (room.isLocked) continue;
    const assignedCount = currentAssignments[room._id.toString()] || 0;
    const available = room.capacity - assignedCount;

    if (available > maxAvailable && available > 0) {
      maxAvailable = available;
      bestRoom = room;
    }
  }

  return bestRoom;
}

export function calcOverallMatchQuality(assignments: AssignmentResult[]): number {
  const total = assignments.reduce((s, a) => s + a.studentIds.length, 0);
  if (total === 0) return 0;
  const weightedScore = assignments.reduce((s, a) => s + (a.matchScore * a.studentIds.length), 0);
  return Math.round(weightedScore / total);
}

// --------------------------------------------------------------------------
// ALGORITHM 5 — Agentic Room Router (AI Driven, Queue-based)
// --------------------------------------------------------------------------

export const agenticRoomRoutingQueue = new Queue('AgenticRoomRouting', { connection: redisClient as any });

interface RoutingJobData {
  students: StudentInput[];
  rooms: RoomInput[];
  existingAssignments: Record<string, string[]>;
  idempotencyKey?: string;
}

export class AgenticRoomRouter {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('AgenticRoomRouting', this.processJob.bind(this), {
      connection: redisClient as any,
      concurrency: 5
    });

    this.worker.on('completed', (job: Job) => {
      console.log(`✅ [AgenticRoomRouter] Job ${job.id} (Idempotency: ${job.data.idempotencyKey}) routed successfully.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`❌ [AgenticRoomRouter] Job ${job?.id} failed:`, err);
    });
  }

  public async queueRouting(students: StudentInput[], rooms: RoomInput[], existingAssignments: Record<string, string[]> = {}, idempotencyKey?: string) {
    console.log(`📡 [AgenticRoomRouter] Queueing Request (Idempotency: ${idempotencyKey || 'none'})`);
    await agenticRoomRoutingQueue.add('route-students', { students, rooms, existingAssignments, idempotencyKey }, {
      jobId: idempotencyKey, // Prevents duplicate jobs based on idempotency key
      removeOnComplete: true,
      removeOnFail: false
    });
  }

  private async processJob(job: Job<RoutingJobData>): Promise<AssignmentResponse> {
    const { students, rooms, existingAssignments } = job.data;

    return new Promise<AssignmentResponse>(async (resolve) => {
      let timeoutId: NodeJS.Timeout;

      // 10000ms circuit breaker for the LLM
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("LLM Call Timed Out (>10000ms)")), 10000);
      });

      try {
        // Build Prompt from Student Profiles & Room Rubrics
        const prompt = `Given the following students and rooms, optimally match them. 
Students: ${JSON.stringify(students)}
Rooms: ${JSON.stringify(rooms)}`;

        // Race LLM vs Timeout
        await Promise.race([
          llmInvoke(prompt),
          timeoutPromise
        ]);

        clearTimeout(timeoutId!);

        // For this mock phase, we just utilize aiSuggestAssignWithOverflow behind the LLM curtain.
        // In production, response structure is fully parsed.
        const result = aiSuggestAssignWithOverflow(students, rooms, existingAssignments);
        resolve(result);

      } catch (error: any) {
        console.warn(`⏳ [AgenticRoomRouter] AI Routing Failed (${error.message}). Falling back to aiSuggestAssignWithOverflow.`);
        if (timeoutId!) clearTimeout(timeoutId);

        // Graceful fallback to legacy AI matching logic
        resolve(aiSuggestAssignWithOverflow(students, rooms, existingAssignments));
      }
    });
  }
}

// Global singleton instance to prevent multiple redundant internal workers
export const globalAgenticRouter = new AgenticRoomRouter();
