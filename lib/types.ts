export type User = { id:string; name:string; username:string; pin:string; role:string; active:boolean; created_at:string };
export type Client = { id:string; name:string; description:string; active:boolean; created_at:string };
export type Project = { id:string; client_id:string; name:string; description:string; status:string; start_date:string; due_date:string; created_at:string };
export type Task = { id:string; client_id:string; project_id:string; title:string; description:string; owner_id:string|null; priority:string; status:string; start_date:string; due_date:string; created_at:string };
export type Subtask = { id:string; task_id:string; title:string; owner_id:string|null; status:string; due_date:string; created_at:string };
export type Comment = { id:string; task_id:string; user_id:string|null; comment:string; created_at:string };
export type FileRecord = { id:string; task_id:string; user_id:string|null; file_name:string; file_url:string; file_type:string; version:number; created_at:string };
