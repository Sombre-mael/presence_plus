import type { Metadata } from "next";
import { PhotoReviewManager } from "@/components/admin/photo-review-manager";
import { getProfilePhotoReviews } from "@/actions/profile-photo.actions";

export const metadata: Metadata = { title: "Vérification des photos · Presence Plus" };

export default async function AdminPhotoReviewsPage() {
  return <PhotoReviewManager initialItems={await getProfilePhotoReviews()} />;
}
