export type UserRole = 'citizen' | 'field_inspector' | 'operator' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization?: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type IncidentStatus = 
  | 'candidate'
  | 'needs_location'
  | 'needs_review'
  | 'corroborated'
  | 'field_verified'
  | 'assigned'
  | 'in_progress'
  | 'repair_claimed'
  | 'resolution_pending_review'
  | 'resolution_verified'
  | 'closed'
  | 'rejected';

export type DefectCategory = 
  | 'pothole'
  | 'road_crack'
  | 'surface_damage'
  | 'manhole_depression'
  | 'drainage_defect'
  | 'other';

export type LocationSource = 
  | 'photo_exif'
  | 'device_gps_at_capture'
  | 'device_gps_at_submission'
  | 'manual_map_pin'
  | 'inspector_confirmed'
  | 'unknown';

export interface RiskBreakdown {
  severity_score: number;
  severity_contribution: number;
  exposure_score: number;
  exposure_contribution: number;
  criticality_score: number;
  criticality_contribution: number;
  hazard_score: number;
  hazard_contribution: number;
  time_unresolved_score: number;
  time_unresolved_contribution: number;
  emergency_escalation: boolean;
  formula_version: string;
  explanation: string;
}

export interface LocationDetail {
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  source: LocationSource;
  readable_address: string | null;
  verified: boolean;
  collected_at?: string;
}

export interface ObservationDetail {
  id: string;
  observation_number: string;
  source_type: string;
  capture_mode: string;
  description: string | null;
  observed_at: string | null;
  submitted_at: string;
  submitted_by: string;
  original_asset_url?: string;
  annotated_asset_url?: string;
  sha256?: string;
  locations: LocationDetail[];
}

export interface AssessmentDetail {
  id: string;
  model_name: string;
  model_version: string;
  category: string;
  visible_severity: string;
  image_quality: string;
  visual_evidence: string;
  uncertainties: string[];
  needs_human_review: boolean;
  confidence_score: number;
  is_fallback: boolean;
  created_at: string;
}

export interface IncidentLinkDetail {
  id: string;
  linked_incident_id: string;
  linked_incident_number: string;
  relation_type: string;
  score: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface WorkOrderDetail {
  id: string;
  work_order_number: string;
  title: string;
  assigned_team: string;
  assigned_inspector?: string;
  status: string;
  checklist: Array<{ item: string; completed: boolean }>;
  inspection_notes?: string;
  repair_notes?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEventDetail {
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  previous_state?: string;
  new_state?: string;
  reason?: string;
  timestamp: string;
}

export interface IncidentSummary {
  id: string;
  incident_number: string;
  title: string;
  category: DefectCategory;
  current_status: IncidentStatus;
  latitude: number | null;
  longitude: number | null;
  readable_address: string | null;
  location_source: LocationSource;
  location_accuracy_m: number | null;
  risk_score: number;
  evidence_confidence: 'low' | 'medium' | 'high';
  observation_count: number;
  has_annotated_image: boolean;
  original_image_url?: string;
  annotated_image_url?: string;
  assigned_team?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentDetailResponse extends IncidentSummary {
  description?: string;
  location: LocationDetail;
  risk_breakdown: RiskBreakdown;
  evidence_confidence_score: number;
  priority_recommendation?: string;
  assigned_to?: string;
  closed_at?: string;
  sha256?: string;
  observations: ObservationDetail[];
  assessments: AssessmentDetail[];
  links: IncidentLinkDetail[];
  work_orders: WorkOrderDetail[];
  audit_events: AuditEventDetail[];
}

export interface IncidentStats {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  awaiting_verification: number;
  assigned_incidents: number;
  repair_claimed: number;
  resolution_pending_review: number;
  resolved_incidents: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  daily_trend: Array<{ date: string; reports: number }>;
}

export interface GeoProofPreview {
  has_exif: boolean;
  exif_gps_found: boolean;
  latitude: number | null;
  longitude: number | null;
  source: string;
  accuracy_m: number | null;
  readable_address: string | null;
  photo_capture_claimed_at: string | null;
  evidence_quality: 'high' | 'medium' | 'low';
  warning: string | null;
  sha256_hash: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  tools_executed?: Array<{
    tool_name: string;
    parameters: any;
    output_summary: string;
    data: any;
  }>;
  referenced_incidents?: string[];
  suggested_actions?: string[];
}

