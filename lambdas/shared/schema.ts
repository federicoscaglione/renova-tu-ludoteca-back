/**
 * Tipos de entidades de la base de datos.
 * Deben coincidir con docs/database.md.
 */

export type GameCondition =
  | "Nuevo"
  | "Como nuevo"
  | "Usado"
  | "Coleccionista";

export interface GameItem {
  gameId: string;
  title: string;
  description: string;
  condition: string;
  price: number;
  location: string;
  sellerId: string;
  tags: string[];
  images: string[];
  createdAt: string;
}

export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed";

export interface OfferItem {
  offerId: string;
  gameId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface MeetupItem {
  sessionId: string;
  title: string;
  game: string[];
  location: string;
  dateTime: string;
  organizerId: string;
  maxPlayers: number;
  description: string;
  createdAt: string;
}

export interface SessionParticipantItem {
  sessionId: string;
  userId: string;
  joinedAt: string;
}
