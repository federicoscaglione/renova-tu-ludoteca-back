import type { MeetupItem, SessionParticipantItem } from "../../shared/schema";
import type { CreateMeetupInput, UpdateMeetupInput } from "../validators";
import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from "../../shared/errors";
import { uuid } from "../../shared/utils";
import * as meetupRepo from "../repositories/meetup.repository";
import * as participantRepo from "../repositories/participant.repository";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) throw new UnauthorizedError();
}

export async function list(): Promise<MeetupItem[]> {
  return meetupRepo.listAll();
}

export async function get(sessionId: string): Promise<MeetupItem & { participants: SessionParticipantItem[] }> {
  const meetup = await meetupRepo.findById(sessionId);
  if (!meetup) throw new NotFoundError("Meetup not found");
  const participants = await participantRepo.listBySession(sessionId);
  return { ...meetup, participants };
}

export async function create(
  userId: string | null,
  body: CreateMeetupInput
): Promise<MeetupItem> {
  requireUserId(userId);
  const sessionId = uuid();
  const createdAt = new Date().toISOString();
  const item: MeetupItem = {
    sessionId,
    title: body.title,
    game: body.game,
    location: body.location,
    dateTime: body.dateTime,
    organizerId: userId,
    maxPlayers: body.maxPlayers,
    description: body.description,
    createdAt,
  };
  await meetupRepo.create(item);
  await participantRepo.create({ sessionId, userId, joinedAt: createdAt });
  return item;
}

export async function update(
  userId: string | null,
  sessionId: string,
  body: UpdateMeetupInput
): Promise<MeetupItem> {
  requireUserId(userId);
  const existing = await meetupRepo.findById(sessionId);
  if (!existing) throw new NotFoundError("Meetup not found");
  if (existing.organizerId !== userId) throw new ForbiddenError();
  const updates: Partial<MeetupItem> = {};
  const allowed = ["title", "game", "location", "dateTime", "maxPlayers", "description"] as const;
  for (const k of allowed) {
    if ((body as Record<string, unknown>)[k] !== undefined) {
      (updates as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k];
    }
  }
  if (Object.keys(updates).length === 0) return existing;
  return meetupRepo.update(sessionId, updates);
}

export async function remove(userId: string | null, sessionId: string): Promise<void> {
  requireUserId(userId);
  const existing = await meetupRepo.findById(sessionId);
  if (!existing) throw new NotFoundError("Meetup not found");
  if (existing.organizerId !== userId) throw new ForbiddenError();
  const participants = await participantRepo.listBySession(sessionId);
  for (const p of participants) {
    await participantRepo.remove(sessionId, p.userId);
  }
  await meetupRepo.remove(sessionId);
}

export async function join(
  userId: string | null,
  sessionId: string
): Promise<{ sessionId: string; userId: string; joinedAt: string }> {
  requireUserId(userId);
  const meetup = await meetupRepo.findById(sessionId);
  if (!meetup) throw new NotFoundError("Meetup not found");
  const existing = await participantRepo.findBySessionAndUser(sessionId, userId);
  if (existing) throw new BadRequestError("Already joined");
  const joinedAt = new Date().toISOString();
  await participantRepo.create({ sessionId, userId, joinedAt });
  return { sessionId, userId, joinedAt };
}

export async function leave(userId: string | null, sessionId: string): Promise<void> {
  requireUserId(userId);
  const meetup = await meetupRepo.findById(sessionId);
  if (!meetup) throw new NotFoundError("Meetup not found");
  const participant = await participantRepo.findBySessionAndUser(sessionId, userId);
  if (!participant) throw new NotFoundError("Not a participant");
  if (meetup.organizerId === userId) {
    throw new BadRequestError("Organizer cannot leave; delete meetup instead");
  }
  await participantRepo.remove(sessionId, userId);
}
