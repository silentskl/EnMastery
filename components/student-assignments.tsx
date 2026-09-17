"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  title: string;
  instructions: string;
  course_title: string;
  school_level: string;
  due_at: string | null;
  target_status: string;
  item_count: number;
};

type AssignmentsResponse = {
  assignments?: Assignment[];
};

export function StudentAssignments() {
  const [list, setList] = useState<Assignment[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const response = await fetch("/api/student/assignments");
      const body = (await response.json()) as AssignmentsResponse;
      if (!cancelled) setList(body.assignments ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="pageIntro">
        <div>
          <div className="eyebrow">Assigned learning</div>
          <h1>Assignments</h1>
          <p>Courses selected by your school, tuition centre or learning organisation.</p>
        </div>
      </div>
      {!list.length ? (
        <div className="emptyState">No assignments have been published to this Student yet.</div>
      ) : (
        <div className="activityGrid">
          {list.map((assignment) => (
            <Link
              className={`activityCard ${assignment.target_status === "completed" ? "tone-green" : ""}`}
              key={assignment.id}
              href={`/assignments/${assignment.id}`}
            >
              <div className="activityKicker">
                {assignment.school_level} · {assignment.target_status}
              </div>
              <h3>{assignment.title}</h3>
              <p>
                {assignment.course_title} · {assignment.item_count} items
              </p>
              <div className="activityMeta">
                {assignment.due_at
                  ? `Due ${new Date(assignment.due_at).toLocaleDateString()}`
                  : "Open assignment"}
              </div>
              <span className="cardArrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
