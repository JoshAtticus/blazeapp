export type PostUpdatePayload = {
  postId: string;
  likes_count?: number;
  broken_hearts_count?: number;
  reposts_count?: number;
  comments_count?: number;
};

export function emitPostUpdate(payload: PostUpdatePayload) {
  window.dispatchEvent(new CustomEvent<PostUpdatePayload>('balze:update-post', { detail: payload }));
}
