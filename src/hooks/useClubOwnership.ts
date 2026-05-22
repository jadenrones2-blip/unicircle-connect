// Re-export from context — singleton ownership state shared across the entire app
export { useClubOwnership } from '@/contexts/ClubOwnershipContext';
export type {
  ClubOwnership,
  VerificationState,
  TrustLevel,
  ClubRestrictions,
} from '@/contexts/ClubOwnershipContext';
