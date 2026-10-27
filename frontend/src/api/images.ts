import { apiGet, apiDelete } from "@/api/client";
import type { Paginated } from "@/types/api";

export interface Image {
  id: string;
  url: string;
  thumbnail_url: string;
  original_filename: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  moderation_status: "PENDING" | "APPROVED" | "REJECTED";
  is_moderated: boolean;
}

export async function uploadImage(file: File): Promise<Image> {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("access_token");
  const response = await fetch("/api/v1/images/upload/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || "Upload failed");
  }

  return response.json();
}

export async function listImages(): Promise<Image[]> {
  return apiGet<Image[]>("/api/v1/images/");
}

export async function deleteImage(id: string): Promise<void> {
  await apiDelete(`/api/v1/images/${id}/`);
}

export async function getThumbnail(
  id: string,
  size: "small" | "medium" | "large" = "small"
): Promise<{ thumbnail_url: string }> {
  return apiGet<{ thumbnail_url: string }>(`/api/v1/images/${id}/thumbnail/${size}/`);
}
