import { getNewsletterSubscribers } from "@/lib/actions/admin";
import { NewsletterClient } from "./newsletter-client";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const subscribers = await getNewsletterSubscribers();
  return (
    <NewsletterClient
      subscribers={subscribers.map((subscriber) => ({
        id: subscriber.id,
        email: subscriber.email,
        source: subscriber.source,
        createdAt: subscriber.createdAt.toISOString(),
      }))}
    />
  );
}
