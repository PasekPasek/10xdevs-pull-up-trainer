import type { SessionDTO } from "@/types";
import { SessionCard } from "@/components/shared/SessionCard";

interface SessionListProps {
  sessions: SessionDTO[];
}

export function SessionList({ sessions }: SessionListProps) {
  return (
    <div className="space-y-4" role="list" aria-label="Session history">
      {sessions.map((session) => (
        <a
          key={session.id}
          href={`/sessions/${session.id}`}
          className="block transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
          aria-label={`View details for session from ${new Date(session.sessionDate).toLocaleDateString()}`}
        >
          <SessionCard session={session} variant="condensed" />
        </a>
      ))}
    </div>
  );
}
