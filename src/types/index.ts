export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC' | 'DIVINE' | 'SPECIAL';

export type ItemCategory = 'Sword' | 'Armour' | 'Pet' | 'Accessories / Items';

export type PetType = 'Normal' | 'Rare';

export type PetTier = 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10';

export interface SkyblockPet {
  id: string;
  name: string;
  normalizedName: string;
  type: PetType;
  status: string; // e.g. "Stable", "Decreasing", "Increasing", "Stable + Decreasing", etc.
  p5: string;
  p6: string;
  p7: string;
  p8: string;
  p9: string;
  p10: string;
  numericP5: number;
  numericP6: number;
  numericP7: number;
  numericP8: number;
  numericP9: number;
  numericP10: number;
  image?: string;
  description?: string;
  updatedAt: number;
  updatedBy?: string;
}

export type DemandLevel = 'VERY LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface SkyblockItem {
  id: string;
  name: string;
  normalizedName: string;
  category: ItemCategory;
  status: string; // e.g. "Stable", "Decreasing", "Increasing", "Unstable", "Stable + Increasing", "Stable + Decreasing", "Decreasing + Stable", "Not specified"
  // For Swords:
  normalValue?: string;
  rareValue?: string;
  // For Armour:
  fourPieceValue?: string;
  fivePieceValue?: string;
  // For Pets:
  petType?: PetType;
  p5?: string;
  p6?: string;
  p7?: string;
  p8?: string;
  p9?: string;
  p10?: string;
  petData?: SkyblockPet;
  // For Accessories / Items:
  displayValue?: string; // Exact range or value string (e.g. "100M - 120M" or "50M")
  minimumValue?: number; // optional range min
  maximumValue?: number; // optional range max
  disabled?: boolean;
  createdAt?: number;
  // Numerical equivalents for sorting and trade calculations:
  value: number; // primary numeric value in coins (Normal or 4/4 or P5 value or base value)
  numericRareValue?: number; // for Rare sword calculations
  numericFivePieceValue?: number; // for 5/5 armour calculations
  demand?: DemandLevel;
  rarity?: ItemRarity;
  image: string;
  description: string;
  updatedAt: string | number;
  tags?: string[];
}

export interface TradeItemSlot {
  item: SkyblockItem;
  quantity: number;
  variant?: 'normal' | 'rare' | '4/4' | '5/5' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | string;
  unitValue?: number;
  selectedDisplayValue?: string;
  petData?: SkyblockPet;
}

export interface TradeRecord {
  id: string;
  userId: string;
  yourItems: { itemId: string; name: string; value: number; quantity: number; image: string; rarity: ItemRarity }[];
  theirItems: { itemId: string; name: string; value: number; quantity: number; image: string; rarity: ItemRarity }[];
  yourTotal: number;
  theirTotal: number;
  difference: number;
  percentageDiff: number;
  timestamp: string | number;
  note?: string;
}

export type UserRole = 'admin' | 'officer' | 'trusted' | 'user' | 'jmd';

export interface JMDPermissions {
  changeValues: boolean;
  banUnban: boolean;
  deleteChats: boolean;
  chooseTrusted: boolean;
}

export interface PermissionAuditLog {
  id: string;
  adminUid: string;
  adminUsername: string;
  jmdUid: string;
  jmdUsername: string;
  permissionChanged: string;
  oldState: Partial<JMDPermissions>;
  newState: Partial<JMDPermissions>;
  timestamp: number;
}

export type MembershipLevel = 'premium_lite' | 'premium' | 'vip';
export type MembershipTitle = 'VANGUARD' | 'OVERLORD' | 'SUPREME';

export interface UserMembership {
  level: MembershipLevel | null;
  title: MembershipTitle | null;
  grantedAt: number;
  grantedBy: string; // admin uid
  grantedByUsername?: string;
  status: 'active' | 'revoked' | 'expired';
}

export interface MembershipAuditLog {
  id: string;
  targetUid: string;
  targetUsername: string;
  previousMembership: MembershipLevel | null;
  newMembership: MembershipLevel | null;
  action: 'grant_premium_lite' | 'grant_premium' | 'grant_vip' | 'change_membership' | 'remove_membership';
  adminUid: string;
  adminUsername: string;
  timestamp: number;
}

export interface UserProfile {
  uid: string;
  username: string; // @username: unique, lowercase a-z and 0-9 only, 3-20 chars
  normalizedUsername: string;
  name?: string; // Display Name: allows uppercase, lowercase, spaces, emojis
  profilePhoto?: string; // Custom uploaded profile photo (data URL / storage URL)
  email: string;
  avatarUrl?: string; // fallback dicebear or photo
  role: UserRole;
  permissions?: JMDPermissions;
  membership?: UserMembership | null;
  createdAt: string | number;
  bio?: string; // max 100 words
  profileSetupComplete?: boolean; // Flag indicating username and name setup has been completed
  
  // Moderation: Ban system
  banned?: boolean;
  isBanned?: boolean; // legacy alias
  banType?: 'temporary' | 'permanent';
  bannedUntil?: number | null; // timestamp ms
  bannedBy?: string; // UID or username
  banReason?: string;
  bannedAt?: number;

  // Moderation: Mute system
  muted?: boolean;
  isMuted?: boolean; // legacy alias
  muteType?: 'temporary' | 'permanent';
  mutedUntil?: number; // timestamp ms
  mutedBy?: string;
  muteReason?: string;

  // Rate Limiting & Cooldowns
  lastWorldChatAt?: number; // timestamp ms of last successful world message
  lastChatMessageNorm?: string; // normalized message string for duplicate detection
  sameMessageCount?: number; // consecutive identical message counter (max 2)

  // Custom Frame Collection Assignments (Managed exclusively by Owner Admin)
  profileFrameId?: string | null;
  textFrameId?: string | null;

  // Economy & Daily Login Rewards
  coinBalance?: number;
  loginStreak?: number;
  lastRewardClaimDate?: string; // YYYY-MM-DD in UTC
  lastRewardClaimTimestamp?: number; // ms
  rewardCycleDay?: number; // 1 to 7

  // Solo / Duo Challenge Post Cooldown
  lastChallengePostAt?: number; // ms timestamp of last created challenge post
}

// TOURNAMENTS
export type TournamentCategory = 'skyblock' | 'bedwars';

export interface Tournament {
  id: string;
  name: string; // 1. Tournament Name
  bannerUrl: string; // 2. Tournament Banner
  category: TournamentCategory; // 3. Game/Category: Skyblock or Bedwars
  dateAndTiming: string; // 4. Tournament Date and Timing (e.g. "Oct 15, 2026 • 8:00 PM IST")
  registeredCount: number; // 5. Registered Players count
  maxPlayers: number; // 5. Maximum Players (e.g. 32)
  winningAmount: string; // 6. Winning Amount (e.g. "1,000,000 Coins" or "₹5,000")
  entryFee: string; // 7. Entry Fee (e.g. "Free" or "500 Coins")
  description?: string; // Optional description
  isPublished: boolean; // Only published tournaments appear in public feed
  registeredUserUids?: string[]; // Registered user UIDs for duplicate check and quick count
  createdAt: number;
  updatedAt?: number;
  createdByAdminUid: string;
  createdByUsername: string;
}

export interface TournamentRegistration {
  id: string; // tournamentId_userUid
  tournamentId: string;
  tournamentName?: string;
  userUid: string;
  appUsername: string;
  displayName: string;
  avatarUrl?: string;
  profilePhoto?: string;
  role?: UserRole;
  membership?: UserMembership | null;
  profileFrameId?: string | null;
  textFrameId?: string | null;
  registeredAt: number;
  registeredByAdminUid: string;
  registeredByUsername: string;
  notes?: string;
}

export type SoloDuoGameType = 'skyblock' | 'bedwars';
export type SoloDuoMatchType = 'solo_vs_solo' | 'duo_vs_duo';

export interface SoloDuoChallenge {
  id: string;
  gameType: SoloDuoGameType;
  matchType: SoloDuoMatchType;
  creatorUid: string;
  creatorUsername: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  creatorProfilePhoto?: string;
  creatorRole?: UserRole;
  creatorMembership?: UserMembership | null;
  creatorProfileFrameId?: string | null;
  creatorTextFrameId?: string | null;
  gameUsername: string; // Player's Minecraft / in-game username
  description: string;
  createdAt: number;
  expiresAt: number; // createdAt + 12 hours
}

export type FrameType = 'profile' | 'text';

export interface FrameItem {
  id: string;
  type: FrameType;
  name: string;
  category: string;
  description: string;
  assetUrl: string; // vector SVG data URL
  previewUrl?: string;
  createdAt: number;
  isActive: boolean;
}

export interface FrameAuditLog {
  id?: string;
  action: 'GIVE_PROFILE_FRAME' | 'REMOVE_PROFILE_FRAME' | 'REPLACE_PROFILE_FRAME' | 'GIVE_TEXT_FRAME' | 'REMOVE_TEXT_FRAME' | 'REPLACE_TEXT_FRAME';
  targetUserUid: string;
  targetUsername: string;
  frameId: string | null;
  frameType: FrameType;
  previousFrameId: string | null;
  adminUid: string;
  adminUsername: string;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  senderUid: string;
  senderUsername: string;
  senderAvatar?: string;
  receiverUid: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: string | number;
}

export interface Friendship {
  id: string;
  users: string[]; // [uid1, uid2] sorted
  usernames: Record<string, string>;
  names?: Record<string, string>;
  avatars: Record<string, string>;
  roles?: Record<string, UserRole>;
  createdAt: string | number;
  lastMessage?: string;
  lastMessageTimestamp?: string | number;
}

export interface ChatReplyInfo {
  messageId: string;
  senderUid: string;
  senderUsername: string;
  senderName?: string;
  senderRole?: UserRole;
  textSnippet: string;
}

export interface PinnedChatMessage {
  id: string;
  messageId: string;
  text: string;
  senderUsername: string;
  senderRole?: UserRole;
  pinnedAt: number;
  expiresAt: number; // 30-minute logical expiration
  pinnedByUid: string;
  pinnedByUsername: string;
}

export interface WorldChatGroup {
  id: string;
  name: string;
  createdAt: number;
  activeUserCount: number;
  maxActiveUsers: number; // 75
  status: 'active' | 'inactive';
  lastActivity: number;
  isAutoCreated?: boolean;
  pinnedMessage?: PinnedChatMessage | null;
}

export interface WorldChatPresence {
  uid: string;
  username: string;
  groupId: string;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  groupId?: string; // which world chat group this message belongs to
  senderUid: string;
  senderUsername: string;
  senderName?: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  senderMembership?: UserMembership | null;
  senderMembershipLevel?: MembershipLevel | null;
  senderProfileFrameId?: string | null;
  senderTextFrameId?: string | null;
  text: string;
  normalizedText?: string;
  sameMessageCount?: number;
  timestamp: string | number;
  createdAt?: number;
  expiresAt?: number;
  replyTo?: ChatReplyInfo | null;
  isPinned?: boolean;
}

export interface ReportItem {
  id: string;
  reporterUid: string;
  reporterUsername: string;
  reporterRole: UserRole;
  reportedUid: string;
  reportedUsername: string;
  reportedRole?: UserRole;
  targetType: 'user' | 'world_message' | 'private_message' | 'recommendation' | 'trade_post';
  targetId: string;
  targetContent?: string;
  targetUsername?: string;
  reason: string;
  evidence?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  actionTaken?: string;
  reviewedByUid?: string;
  reviewedByUsername?: string;
  reviewedAt?: number;
  createdAt: number;
}

export interface ValueAuditLog {
  id: string;
  itemId: string;
  itemName: string;
  oldValue: number;
  newValue: number;
  oldDemand: DemandLevel;
  newDemand: DemandLevel;
  changedByUid: string;
  changedByUsername: string;
  changedByRole: 'admin' | 'officer';
  timestamp: number;
}

export type ModerationActionType = 
  | 'USER_BANNED'
  | 'USER_TEMP_BANNED'
  | 'USER_UNBANNED'
  | 'USER_MUTED'
  | 'USER_UNMUTED'
  | 'ROLE_CHANGED'
  | 'VALUE_CHANGED';

export interface ModerationHistoryItem {
  id: string;
  action: ModerationActionType | string;
  targetUid: string;
  targetUsername: string;
  performedByUid: string;
  performedByUsername: string;
  performedByRole: UserRole;
  adminUid?: string;
  timestamp: number;
  reason?: string;
  previousRole?: UserRole;
  newRole?: UserRole;
  previousBanStatus?: string;
  newBanStatus?: string;
  details?: Record<string, any>;
}

export interface TradePostItem {
  itemId: string;
  name: string;
  category: ItemCategory;
  variant?: string;
  quantity: number;
  displayValue?: string;
  unitValue?: number;
  image?: string;
  petTier?: PetTier;
}

export type TradePostTag = 'looking_for' | 'urgent' | string;

export interface TradePost {
  id: string;
  posterUid: string;
  posterDisplayName: string;
  posterUsername: string;
  posterPhotoURL: string;
  posterRole: UserRole | string;
  posterMembership?: UserMembership | null;
  posterMembershipLevel?: MembershipLevel | null;
  posterVerified?: boolean;
  createdAt: number;
  yourItems: TradePostItem[];
  myItems: TradePostItem[];
  yourTotal: number;
  myTotal: number;
  yourTotalDisplay: string;
  myTotalDisplay: string;
  difference: number;
  differenceDisplay: string;
  differencePercentage: number;
  differenceDirection?: 'up' | 'down' | 'equal';
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  note?: string;
  expiresAt: number;
  tags?: TradePostTag[];
  isUrgent?: boolean;
  isLookingFor?: boolean;
}

// ==========================================
// SKYBLOCK WARS & BEDWARS TYPES
// ==========================================

export type WarsCategory = 'skyblock' | 'bedwars';
export type WarsSubTab = 'gangs' | 'announcements' | 'leaderboard' | 'matchings' | 'live';
export type SkyblockWarsSubTab = WarsSubTab;

export interface WarsGangMember {
  uid: string;
  username: string;
  displayName?: string;
  role: 'leader' | 'member';
  joinedAt: number;
  avatarUrl?: string;
  profilePhoto?: string;
  userRole?: UserRole;
  membership?: UserMembership;
  profileFrameId?: string | null;
  textFrameId?: string | null;
}

export interface WarsGang {
  id: string;
  gameType?: WarsCategory;
  name: string;
  tag?: string;
  iconUrl?: string;
  leaderUid: string;
  leaderUsername: string;
  members: WarsGangMember[];
  memberUids: string[];
  createdAt: number;
  status: 'active' | 'recruiting' | 'archived';
  bio?: string;
  stats?: {
    wins: number;
    losses: number;
    rating: number;
    kills?: number;
  };
  updatedAt?: number;
}

export interface WarsGangMessage {
  id: string;
  gangId: string;
  gameType?: WarsCategory;
  senderUid: string;
  senderUsername: string;
  senderDisplayName?: string;
  senderAvatar?: string;
  senderRole?: UserRole | string;
  senderMembership?: UserMembership;
  senderMembershipLevel?: MembershipLevel | string;
  text: string;
  createdAt: number;
  expiresAt: number; // createdAt + 30 mins (30 * 60 * 1000)
  isPinned?: boolean;
}

export interface GangInvitation {
  id: string;
  gangId: string;
  gangName: string;
  gangTag?: string;
  gangIcon?: string;
  gameType: WarsCategory;
  senderUid: string;
  senderUsername: string;
  receiverUid: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface WarsAnnouncement {
  id: string;
  gameType?: WarsCategory;
  title: string;
  content: string;
  thumbnailUrl?: string;
  isImportant?: boolean;
  createdByUid: string;
  createdByUsername: string;
  createdAt: number;
  updatedAt?: number;
}

export interface WarsLeaderboardEntry {
  id: string;
  gameType?: WarsCategory;
  rank: number;
  gangId?: string;
  gangName: string;
  gangTag?: string;
  gangIcon?: string;
  score?: string;
  notes?: string;
  order: number;
  updatedAt?: number;
}

export interface WarsMatching {
  id: string;
  gameType?: WarsCategory;
  gangId: string;
  gangName: string;
  gangTag?: string;
  gangIcon?: string;
  thumbnailUrl?: string;
  leaderUid: string;
  leaderUsername: string;
  title: string;
  description: string;
  format?: string; // e.g. "4v4", "5v5", "Scrim", "Ranked"
  scheduledTime?: string;
  status: 'open' | 'matched' | 'closed';
  challengerGangId?: string;
  challengerGangName?: string;
  createdAt: number;
}

export interface WarsLiveUpdate {
  id: string;
  timestamp: number;
  text: string;
  author: string;
}

export interface WarsLiveMatch {
  id: string;
  gameType?: WarsCategory;
  title: string;
  category?: WarsCategory;
  thumbnailUrl?: string;
  description?: string;
  gang1: {
    id?: string;
    name: string;
    tag?: string;
    icon?: string;
    score: number;
  };
  gang2: {
    id?: string;
    name: string;
    tag?: string;
    icon?: string;
    score: number;
  };
  status: 'upcoming' | 'live' | 'completed';
  roundInfo: string;
  streamUrl?: string;
  notes?: string;
  winnerId?: string;
  winnerName?: string;
  liveUpdates?: WarsLiveUpdate[];
  createdAt: number;
  updatedAt?: number;
}

export type MidManCategory = 'account_trades' | 'upi_trade';

export interface MidManPost {
  id: string;
  category: MidManCategory;
  targetUserUid: string;
  appUsername: string;
  appDisplayName?: string;
  gameUsername: string;
  profilePhoto?: string;
  description: string;
  charges: string;
  createdAt: number;
  createdByAdminUid: string;
  updatedAt?: number;
}
