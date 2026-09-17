"use client";

import { useEffect, useMemo, useState } from "react";

type Course = {
  id: string;
  title: string;
  school_level: string;
  status: string;
  item_count: number;
  assignment_count: number;
};
type Resource = {
  id: string;
  title?: string;
  name?: string;
  type: string;
  school_level: string;
  scope: string;
  status?: string;
};
type Item = { id: string; item_type: string; resource_id: string; item_order: number };

export function TenantCourseManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<{ content: Resource[]; questions: Resource[]; practiceSets: Resource[]; assessments: Resource[] }>({
    content: [],
    questions: [],
    practiceSets: [],
    assessments: [],
  });
  const [selected, setSelected] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [courseStatus, setCourseStatus] = useState("all");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ title: "", description: "", schoolLevel: "P6" });
  const [itemType, setItemType] = useState("content");
  const [resourceId, setResourceId] = useState("");

  async function load() {
    const [courseResponse, resourceResponse] = await Promise.all([
      fetch("/api/admin/courses").then((response) => response.json()) as Promise<{ courses?: Course[] }>,
      fetch("/api/admin/resources").then((response) => response.json()) as Promise<typeof resources>,
    ]);
    setCourses(courseResponse.courses || []);
    setResources(resourceResponse);
  }

  useEffect(() => { void load(); }, []);

  const courseStatuses = useMemo(() => [...new Set(courses.map((course) => course.status))].sort(), [courses]);
  const filteredCourses = useMemo(
    () => courses.filter((course) => courseStatus === "all" || course.status === courseStatus),
    [courses, courseStatus],
  );
  const pool = useMemo(
    () => itemType === "content" ? resources.content : itemType === "question" ? resources.questions : itemType === "practice_set" ? resources.practiceSets : resources.assessments,
    [itemType, resources],
  );
  const selectedCourseRows = useMemo(() => courses.filter((course) => selectedCourses.includes(course.id)), [courses, selectedCourses]);
  const selectedArchivable = selectedCourseRows.filter((course) => course.status !== "archived").map((course) => course.id);
  const selectedRestorable = selectedCourseRows.filter((course) => course.status === "archived").map((course) => course.id);

  useEffect(() => {
    setSelectedCourses([]);
  }, [courseStatus]);

  async function loadItems(id: string) {
    setSelected(id);
    if (!id) {
      setItems([]);
      return;
    }
    const body = await fetch(`/api/admin/courses/${id}/items`).then((response) => response.json()) as { items?: Item[] };
    setItems(body.items || []);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; error?: string };
    setStatus(response.ok ? "Course created." : body.error || "Create failed");
    if (response.ok) {
      setForm({ ...form, title: "", description: "" });
      await load();
      if (body.id) await loadItems(body.id);
    }
  }

  async function addItem() {
    if (!selected || !resourceId) return;
    const response = await fetch(`/api/admin/courses/${selected}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, resourceId }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setStatus(response.ok ? "Resource added." : body.error || "Add failed");
    if (response.ok) {
      setResourceId("");
      await loadItems(selected);
      await load();
    }
  }

  function toggleCourse(id: string) {
    setSelectedCourses((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function bulkCourseStatus(nextStatus: "archived" | "draft") {
    const ids = nextStatus === "archived" ? selectedArchivable : selectedRestorable;
    if (!ids.length) return;
    const label = nextStatus === "archived" ? "archive" : "restore to draft";
    if (!confirm(`${label} ${ids.length} selected course${ids.length === 1 ? "" : "s"}?`)) return;
    const response = await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: nextStatus }),
    });
    const body = await response.json().catch(() => ({})) as { changed?: number; error?: string };
    setStatus(response.ok ? `${body.changed ?? ids.length} course${ids.length === 1 ? "" : "s"} updated.` : body.error || "Bulk update failed.");
    if (response.ok) {
      setSelectedCourses([]);
      await load();
    }
  }

  return (
    <>
      <div className="sectionHeading">
        <div>
          <span>Curriculum assembly</span>
          <h1>Courses</h1>
          <p>Filter courses by status, select matching courses in bulk, and assemble published learning resources into a tenant curriculum.</p>
        </div>
      </div>

      <div className="adminSplit">
        <form className="card stackForm" onSubmit={create}>
          <h3>New course</h3>
          <label><span className="fieldLabel">Title</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label><span className="fieldLabel">Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label><span className="fieldLabel">Level</span><select value={form.schoolLevel} onChange={(event) => setForm({ ...form, schoolLevel: event.target.value })}><option>P5</option><option>P6</option></select></label>
          <button className="button primary">Create course</button>
          {status && <div className="formStatus">{status}</div>}
        </form>

        <div className="card">
          <div className="cardHeader"><h3>Courses</h3><span>{filteredCourses.length} / {courses.length}</span></div>
          <div className="rowActions" style={{ marginBottom: 12 }}>
            <label>Status <select value={courseStatus} onChange={(event) => setCourseStatus(event.target.value)}><option value="all">All statuses</option>{courseStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <button className="button ghost smallButton" disabled={!filteredCourses.length} onClick={() => setSelectedCourses(filteredCourses.map((course) => course.id))}>Select filtered</button>
            <button className="button ghost smallButton" onClick={() => setSelectedCourses([])}>Clear</button>
          </div>
          <div className="contentTableWrap">
            <table className="monitorTable">
              <thead><tr><th></th><th>Course</th><th>Status</th><th>Open</th></tr></thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course.id}>
                    <td><input aria-label={`Select ${course.title}`} type="checkbox" checked={selectedCourses.includes(course.id)} onChange={() => toggleCourse(course.id)} /></td>
                    <td><strong>{course.title}</strong><div className="tableSub">{course.school_level} · {course.item_count} items · {course.assignment_count} assignments</div></td>
                    <td><span className={course.status === "published" ? "statusPill published" : "statusPill"}>{course.status}</span></td>
                    <td><button type="button" className={selected === course.id ? "button primary smallButton" : "button ghost smallButton"} onClick={() => loadItems(course.id)}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rowActions" style={{ marginTop: 12 }}>
            <button className="button secondary smallButton" disabled={!selectedArchivable.length} onClick={() => bulkCourseStatus("archived")}>Archive selected ({selectedArchivable.length})</button>
            <button className="button ghost smallButton" disabled={!selectedRestorable.length} onClick={() => bulkCourseStatus("draft")}>Restore selected to draft ({selectedRestorable.length})</button>
            <span>{selectedCourses.length} selected</span>
          </div>
        </div>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="cardHeader"><h2>Course items</h2><span>{items.length} items</span></div>
          <div className="formGrid">
            <label>
              <span className="fieldLabel">Resource type</span>
              <select value={itemType} onChange={(event) => { setItemType(event.target.value); setResourceId(""); }}>
                <option value="content">Lesson/content</option>
                <option value="question">Question</option>
                <option value="practice_set">Practice set</option>
                <option value="assessment">Assessment</option>
              </select>
            </label>
            <label>
              <span className="fieldLabel">Visible resource</span>
              <select value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
                <option value="">Select…</option>
                {pool.map((resource) => <option key={resource.id} value={resource.id}>{resource.title || resource.name || resource.id} · {resource.school_level} · {resource.scope}</option>)}
              </select>
            </label>
          </div>
          <button className="button primary" onClick={addItem}>Add resource</button>
          <table className="monitorTable" style={{ marginTop: 16 }}>
            <thead><tr><th>#</th><th>Type</th><th>Resource ID</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td>{item.item_order}</td><td>{item.item_type}</td><td>{item.resource_id}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
