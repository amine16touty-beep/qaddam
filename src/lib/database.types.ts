
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "action": string,"created_at": string,"entity_id": string,"entity_type": string,"id": number,"project_id": string | null,"title": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: never,"project_id"?: string | null,"title"?: string | null,"user_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: never,"project_id"?: string | null,"title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"contexts": {
                  Row: {
                    "color": string,"created_at": string,"icon": string,"id": string,"is_archived": boolean,"name": string,"position": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_archived"?: boolean,"name": string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_archived"?: boolean,"name"?: string,"position"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"decisions": {
                  Row: {
                    "action": string | null,"created_at": string,"due_date": string | null,"id": string,"meeting_id": string,"owner_text": string | null,"position": number,"search_text": string | null,"text": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"meeting_id": string,"owner_text"?: string | null,"position"?: number,"search_text"?: never,"text": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "action"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"meeting_id"?: string,"owner_text"?: string | null,"position"?: number,"search_text"?: never,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decisions_meeting_id_user_id_fkey"
      columns: ["meeting_id","user_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "context_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"id": string,"status": string,"target_date": string | null,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"status"?: string,"target_date"?: string | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"status"?: string,"target_date"?: string | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"habit_logs": {
                  Row: {
                    "created_at": string,"habit_id": string,"id": string,"log_date": string,"note": string | null,"updated_at": string,"user_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"habit_id": string,"id"?: string,"log_date": string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"value"?: number
                  }
                  Update: {
                    "created_at"?: string,"habit_id"?: string,"id"?: string,"log_date"?: string,"note"?: string | null,"updated_at"?: string,"user_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_logs_habit_id_user_id_fkey"
      columns: ["habit_id","user_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "archived_at": string | null,"context_id": string | null,"created_at": string,"deleted_at": string | null,"frequency_type": string,"goal_id": string | null,"id": string,"name": string,"position": number,"preferred_time": string | null,"start_date": string,"target_unit": string | null,"target_value": number | null,"times_per_week": number | null,"updated_at": string,"user_id": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"frequency_type"?: string,"goal_id"?: string | null,"id"?: string,"name": string,"position"?: number,"preferred_time"?: string | null,"start_date"?: string,"target_unit"?: string | null,"target_value"?: number | null,"times_per_week"?: number | null,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "archived_at"?: string | null,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"frequency_type"?: string,"goal_id"?: string | null,"id"?: string,"name"?: string,"position"?: number,"preferred_time"?: string | null,"start_date"?: string,"target_unit"?: string | null,"target_value"?: number | null,"times_per_week"?: number | null,"updated_at"?: string,"user_id"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "habits_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"meetings": {
                  Row: {
                    "agenda": string,"context_id": string | null,"created_at": string,"deleted_at": string | null,"ends_at": string | null,"external_id": string | null,"external_source": string | null,"id": string,"location": string | null,"notes": string,"participants": (string)[],"project_id": string | null,"reminded_at": string | null,"search_text": string | null,"starts_at": string,"title": string,"updated_at": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agenda"?: string,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"ends_at"?: string | null,"external_id"?: string | null,"external_source"?: string | null,"id"?: string,"location"?: string | null,"notes"?: string,"participants"?: (string)[],"project_id"?: string | null,"reminded_at"?: string | null,"search_text"?: never,"starts_at": string,"title": string,"updated_at"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "agenda"?: string,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"ends_at"?: string | null,"external_id"?: string | null,"external_source"?: string | null,"id"?: string,"location"?: string | null,"notes"?: string,"participants"?: (string)[],"project_id"?: string | null,"reminded_at"?: string | null,"search_text"?: never,"starts_at"?: string,"title"?: string,"updated_at"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meetings_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "meetings_project_id_user_id_fkey"
      columns: ["project_id","user_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"due_date": string | null,"id": string,"position": number,"project_id": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"position"?: number,"project_id": string,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"id"?: string,"position"?: number,"project_id"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_project_id_user_id_fkey"
      columns: ["project_id","user_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "body": string,"context_id": string | null,"created_at": string,"deleted_at": string | null,"id": string,"kind": string,"meeting_id": string | null,"pinned": boolean,"project_id": string | null,"search_text": string | null,"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: string,"meeting_id"?: string | null,"pinned"?: boolean,"project_id"?: string | null,"search_text"?: never,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: string,"meeting_id"?: string | null,"pinned"?: boolean,"project_id"?: string | null,"search_text"?: never,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "notes_meeting_id_user_id_fkey"
      columns: ["meeting_id","user_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "notes_project_id_user_id_fkey"
      columns: ["project_id","user_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "calendar_token": string | null,"created_at": string,"display_name": string | null,"id": string,"locale": string,"numerals": string,"remind_meetings_min": number,"remind_tasks": boolean,"theme": string,"timezone": string,"updated_at": string,"week_start": number
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar_token"?: string | null,"created_at"?: string,"display_name"?: string | null,"id": string,"locale"?: string,"numerals"?: string,"remind_meetings_min"?: number,"remind_tasks"?: boolean,"theme"?: string,"timezone"?: string,"updated_at"?: string,"week_start"?: number
                  }
                  Update: {
                    "calendar_token"?: string | null,"created_at"?: string,"display_name"?: string | null,"id"?: string,"locale"?: string,"numerals"?: string,"remind_meetings_min"?: number,"remind_tasks"?: boolean,"theme"?: string,"timezone"?: string,"updated_at"?: string,"week_start"?: number
                  }
                  Relationships: [
                    
                  ]
                },"programs": {
                  Row: {
                    "context_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"goal_id": string | null,"id": string,"name": string,"start_date": string | null,"status": string,"target_date": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"goal_id"?: string | null,"id"?: string,"name": string,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"goal_id"?: string | null,"id"?: string,"name"?: string,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "programs_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "context_id": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"goal_id": string | null,"id": string,"last_activity_at": string,"links": NonNullable<Json>,"name": string,"objective": string | null,"program_id": string | null,"search_text": string | null,"start_date": string | null,"status": string,"target_date": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"goal_id"?: string | null,"id"?: string,"last_activity_at"?: string,"links"?: NonNullable<Json>,"name": string,"objective"?: string | null,"program_id"?: string | null,"search_text"?: never,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "context_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"goal_id"?: string | null,"id"?: string,"last_activity_at"?: string,"links"?: NonNullable<Json>,"name"?: string,"objective"?: string | null,"program_id"?: string | null,"search_text"?: never,"start_date"?: string | null,"status"?: string,"target_date"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "projects_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "projects_program_id_user_id_fkey"
      columns: ["program_id","user_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"device": string | null,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"device"?: string | null,"endpoint": string,"id"?: string,"p256dh": string,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"device"?: string | null,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "completed_at": string | null,"context_id": string | null,"created_at": string,"decision_id": string | null,"deleted_at": string | null,"due_date": string | null,"due_time": string | null,"id": string,"kind": string,"meeting_id": string | null,"milestone_id": string | null,"notes": string | null,"owner_text": string | null,"position": number,"priority": string,"priority_date": string | null,"project_id": string | null,"reminded_at": string | null,"search_text": string | null,"status": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"context_id"?: string | null,"created_at"?: string,"decision_id"?: string | null,"deleted_at"?: string | null,"due_date"?: string | null,"due_time"?: string | null,"id"?: string,"kind"?: string,"meeting_id"?: string | null,"milestone_id"?: string | null,"notes"?: string | null,"owner_text"?: string | null,"position"?: number,"priority"?: string,"priority_date"?: string | null,"project_id"?: string | null,"reminded_at"?: string | null,"search_text"?: never,"status"?: string,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"context_id"?: string | null,"created_at"?: string,"decision_id"?: string | null,"deleted_at"?: string | null,"due_date"?: string | null,"due_time"?: string | null,"id"?: string,"kind"?: string,"meeting_id"?: string | null,"milestone_id"?: string | null,"notes"?: string | null,"owner_text"?: string | null,"position"?: number,"priority"?: string,"priority_date"?: string | null,"project_id"?: string | null,"reminded_at"?: string | null,"search_text"?: never,"status"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_context_id_user_id_fkey"
      columns: ["context_id","user_id"]
isOneToOne: false
      referencedRelation: "contexts"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_decision_id_user_id_fkey"
      columns: ["decision_id","user_id"]
isOneToOne: false
      referencedRelation: "decisions"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_meeting_id_user_id_fkey"
      columns: ["meeting_id","user_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_milestone_id_user_id_fkey"
      columns: ["milestone_id","user_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "tasks_project_id_user_id_fkey"
      columns: ["project_id","user_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"weekly_reviews": {
                  Row: {
                    "created_at": string,"focus": (string)[],"id": string,"reflection": string,"updated_at": string,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"focus"?: (string)[],"id"?: string,"reflection"?: string,"updated_at"?: string,"user_id"?: string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"focus"?: (string)[],"id"?: string,"reflection"?: string,"updated_at"?: string,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "calendar_feed":
{ Args: { "p_token": string }; Returns: {
              "agenda": string,
"ends_at": string | null,
"id": string,
"location": string | null,
"participants": string[],
"starts_at": string,
"timezone": string,
"title": string,
"updated_at": string,
"url": string | null
            }[]
                           },"convert_decision_to_task":
{ Args: { "p_decision_id": string }; Returns: {
              "completed_at": string | null,
"context_id": string | null,
"created_at": string,
"decision_id": string | null,
"deleted_at": string | null,
"due_date": string | null,
"due_time": string | null,
"id": string,
"kind": string,
"meeting_id": string | null,
"milestone_id": string | null,
"notes": string | null,
"owner_text": string | null,
"position": number,
"priority": string,
"priority_date": string | null,
"project_id": string | null,
"reminded_at": string | null,
"search_text": string | null,
"status": string,
"title": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "tasks"
        isOneToOne: true
        isSetofReturn: false
      } },
"normalize_search":
{ Args: { "t": string }; Returns: string
                           },
"search_all":
{ Args: { "max_per_kind"?: number,"q": string }; Returns: {
              "at": string,"id": string,"kind": string,"score": number,"subtitle": string,"title": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
