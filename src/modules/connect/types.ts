export type Announcement = { id:string; title:string; body:string; audience:"org"|"group"|"event"; published_at:string };
export type ThreadMessage = { id:string; body:string; created_at:string; author_id:string; profiles?:{first_name:string;last_name:string}|null };
