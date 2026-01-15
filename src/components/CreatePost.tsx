import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { z } from "zod";

const postSchema = z.object({
  content: z.string()
});

const validateMediaFile = async (file: File): Promise<boolean> => {
  return true;
};

interface CreatePostProps {
  userId: string;
  onPostCreated: () => void;
}

const CreatePost = ({ userId, onPostCreated }: CreatePostProps) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      if (uploadError.message.includes('No space left')) {
        throw new Error('Storage is full. Please contact support or try again later.');
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const validatedData = postSchema.parse({ content });
      
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
      }

      const { data: newPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: validatedData.content,
          image_url: mediaUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Extract @username mentions from content
      const mentionRegex = /@(\w+)/g;
      const mentions = [...validatedData.content.matchAll(mentionRegex)];
      const taggedUsernames = [...new Set(mentions.map(match => match[1]))];

      // Notify tagged users
      if (taggedUsernames.length > 0 && newPost) {
        await supabase.rpc("notify_tagged_users", {
          post_id_param: newPost.id,
          tagged_usernames: taggedUsernames,
        });
      }

      toast.success("Post created successfully!");
      setContent("");
      setMediaFile(null);
      setMediaPreview(null);
      setOpen(false);
      onPostCreated();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create post");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button id="create-post-trigger" className="hidden" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={loading}
          />
          
          {mediaPreview && (
            <div className="relative">
              {mediaFile?.type.startsWith('video/') ? (
                <video 
                  src={mediaPreview} 
                  controls 
                  className="w-full rounded-lg max-h-96"
                />
              ) : (
                <img 
                  src={mediaPreview} 
                  alt="Preview" 
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeMedia}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="*"
              onChange={handleMediaChange}
              className="hidden"
              id="media-upload"
              disabled={loading}
            />
            <label htmlFor="media-upload">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={loading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {mediaFile ? 'Change File' : 'Upload Anything'}
                </span>
              </Button>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
