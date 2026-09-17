"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type UiLanguage = "en" | "zh-CN";

type Dictionary = Record<string, { en: string; zh: string }>;

const messages: Dictionary = {
  dashboard: { en: "Dashboard", zh: "仪表盘" },
  tenants: { en: "Tenants", zh: "租户" },
  sourcesContent: { en: "Sources & Content", zh: "来源与内容" },
  questions: { en: "Questions", zh: "题目" },
  workQueue: { en: "Work Queue", zh: "任务队列" },
  syllabusMonitor: { en: "Syllabus Monitor", zh: "课程大纲监控" },
  roadmap: { en: "Roadmap", zh: "路线图" },
  integrations: { en: "Integrations", zh: "集成设置" },
  students: { en: "Students", zh: "学生" },
  learnSettings: { en: "Learn settings", zh: "学习设置" },
  practiceSettings: { en: "Practice settings", zh: "练习设置" },
  vocabularyAdmin: { en: "Word Books", zh: "词书管理" },
  practiceExams: { en: "Practice & Exams", zh: "练习与考试" },
  courses: { en: "Courses", zh: "课程" },
  assignments: { en: "Assignments", zh: "作业" },
  aiUsage: { en: "AI Usage", zh: "AI 用量" },
  modelbridge: { en: "ModelBridge", zh: "ModelBridge" },
  platformConsole: { en: "Platform console", zh: "平台控制台" },
  adminConsole: { en: "Admin console", zh: "租户管理台" },
  platformOperator: { en: "Platform Operator", zh: "平台管理员" },
  tenantAdmin: { en: "Tenant Admin", zh: "租户管理员" },
  globalCurriculum: { en: "Global curriculum & resources", zh: "全局课程与资源" },
  contentStudents: { en: "Content, students & assignments", zh: "内容、学生与作业" },
  studentView: { en: "← Student view", zh: "← 学生视图" },
  sourceWorkspace: { en: "Source & content workspace", zh: "来源与内容工作台" },
  sourceWorkspaceDesc: { en: "One workspace for Reading, Listening, Speaking, Writing, Cloze and the shared content library.", zh: "在一个工作台中统一管理阅读、听力、口语、写作、完形填空以及共享内容库。" },
  tenantCatalogue: { en: "Tenant + platform catalogue", zh: "租户 + 平台内容库" },
  platformCatalogue: { en: "Platform global catalogue", zh: "平台全局内容库" },
  reading: { en: "Reading", zh: "阅读" },
  listening: { en: "Listening", zh: "听力" },
  speaking: { en: "Speaking", zh: "口语" },
  writing: { en: "Writing", zh: "写作" },
  questionBank: { en: "Cloze & Question Bank", zh: "完形与题库" },
  contentLibrary: { en: "Content Library", zh: "内容库" },
  webRss: { en: "Web / RSS sources", zh: "网页 / RSS 来源" },
  youtubePodcast: { en: "YouTube / podcast", zh: "YouTube / 播客" },
  readingStimulus: { en: "Reading Aloud / Stimulus", zh: "朗读 / 图片会话" },
  continuousSituational: { en: "Continuous / Situational", zh: "连续写作 / 情境写作" },
  qbankHint: { en: "Cloze / comprehension / oral / writing", zh: "完形 / 阅读理解 / 口语 / 写作" },
  reviewManage: { en: "Review / publish / manage", zh: "审核 / 发布 / 管理" },
  ownedAudio: { en: "Owned / authorised audio", zh: "自有 / 已授权音频" },
  ownedAudioDesc: { en: "Create intensive listening material without leaving the unified Source & Content workspace.", zh: "无需离开统一的来源与内容工作台，即可创建精听学习材料。" },
  language: { en: "Language", zh: "语言" },
  english: { en: "English", zh: "English" },
  chinese: { en: "中文", zh: "中文" },
};

const reverseExact = new Map<string, string>();
Object.values(messages).forEach(({ en, zh }) => {
  reverseExact.set(en, zh);
});

// Common operation-console labels are translated across existing admin components
// without altering source names, lesson titles, prompts or generated learning content.
[
  ["Sources & content", "来源与内容"],
  ["Manage source catalogues and create Reading, Listening, Speaking, Writing, Cloze and Question Bank content from one workspace. Generated material remains draft-first where review is required.", "在同一工作台管理来源目录并创建阅读、听力、口语、写作、完形和题库内容。需要审核的生成内容默认先保存为草稿。"],
  ["Use platform-approved sources and create tenant-private Reading, Listening, Speaking, Writing, Cloze and Question Bank material from one workspace.", "使用平台批准的来源，在同一工作台创建租户私有的阅读、听力、口语、写作、完形和题库内容。"],
  ["Add source", "添加来源"],
  ["Add listening source", "添加听力来源"],
  ["Create & Queue", "创建并加入队列"],
  ["Create and queue", "创建并加入队列"],
  ["Discover", "发现内容"],
  ["Refresh", "刷新"],
  ["Retry", "重试"],
  ["Delete", "删除"],
  ["Delete selected", "删除所选"],
  ["Select all", "全选"],
  ["Select filtered", "选择筛选结果"],
  ["Clear", "清除"],
  ["Clear filters", "清除筛选"],
  ["Save", "保存"],
  ["Cancel", "取消"],
  ["Edit", "编辑"],
  ["Publish", "发布"],
  ["Publish selected", "发布所选"],
  ["Publish selected drafts", "发布所选草稿"],
  ["Enabled", "已启用"],
  ["Disabled", "已停用"],
  ["All statuses", "全部状态"],
  ["Status", "状态"],
  ["Source", "来源"],
  ["Sources", "来源"],
  ["Topic", "主题"],
  ["Level", "年级"],
  ["Default level", "默认年级"],
  ["Name", "名称"],
  ["Type", "类型"],
  ["Title", "标题"],
  ["Description", "说明"],
  ["Actions", "操作"],
  ["Created", "创建时间"],
  ["Updated", "更新时间"],
  ["Draft", "草稿"],
  ["Published", "已发布"],
  ["Failed", "失败"],
  ["Queued", "排队中"],
  ["Running", "处理中"],
  ["Succeeded", "成功"],
  ["Platform", "平台"],
  ["Tenant", "租户"],
  ["Global", "全局"],
  ["Search", "搜索"],
  ["Filters", "筛选"],
  ["Newest first", "最新优先"],
  ["Relevance", "相关度"],
  ["Most viewed", "观看最多"],
  ["Made for Kids", "儿童内容标记"],
  ["Minimum duration", "最短时长"],
  ["Maximum duration", "最长时长"],
  ["Published from", "发布起始日期"],
  ["Published to", "发布截止日期"],
  ["Work queue", "任务队列"],
  ["Reading lesson library", "阅读课程库"],
  ["Speaking sources", "口语来源"],
  ["Writing sources", "写作来源"],
  ["Cloze sources", "完形填空来源"],
  ["Question Bank sources", "题库来源"],
  ["Cloze library", "完形填空库"],
  ["Question library", "题目库"],
  ["All content library", "全部内容库"],
  ["All types", "全部类型"],
  ["Take offline", "下线"],
  ["Content", "内容"],
  ["Questions", "题目"],
  ["Job details", "任务详情"],
  ["Error", "错误"],
  ["Logs", "日志"],
].forEach(([en, zh]) => reverseExact.set(en, zh));

const attributeTranslations = new Map<string, string>([
  ["Search", "搜索"],
  ["Search sources", "搜索来源"],
  ["Search lessons", "搜索课程"],
  ["Search videos", "搜索视频"],
]);

const UiLanguageContext = createContext<{
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: keyof typeof messages) => string;
} | null>(null);

function translateOpsDom(root: HTMLElement, language: UiLanguage) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = textWalker.nextNode())) {
    const el = node.parentElement;
    if (!el || el.closest("[data-i18n-skip]") || ["SCRIPT", "STYLE", "CODE", "PRE"].includes(el.tagName)) continue;
    const raw = node.textContent || "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const original = el.dataset.i18nOriginalText || trimmed;
    if (!el.dataset.i18nOriginalText && (reverseExact.has(trimmed) || [...reverseExact.values()].includes(trimmed))) {
      el.dataset.i18nOriginalText = [...reverseExact.entries()].find(([, zh]) => zh === trimmed)?.[0] || trimmed;
    }
    const english = el.dataset.i18nOriginalText || original;
    const replacement = language === "zh-CN" ? reverseExact.get(english) : english;
    if (replacement && replacement !== trimmed) node.textContent = raw.replace(trimmed, replacement);
  }

  root.querySelectorAll<HTMLElement>("input[placeholder], textarea[placeholder]").forEach(el => {
    const current = el.getAttribute("placeholder") || "";
    if (!current) return;
    const original = el.dataset.i18nOriginalPlaceholder || [...attributeTranslations.entries()].find(([, zh]) => zh === current)?.[0] || current;
    el.dataset.i18nOriginalPlaceholder = original;
    el.setAttribute("placeholder", language === "zh-CN" ? (attributeTranslations.get(original) || original) : original);
  });
}

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("em-ui-language");
    if (saved === "zh-CN" || saved === "en") setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((next: UiLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem("em-ui-language", next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh-CN" ? "zh-CN" : "en";
    const root = document.querySelector<HTMLElement>(".appShell.adminMode");
    if (!root) return;
    translateOpsDom(root, language);
    const observer = new MutationObserver(() => translateOpsDom(root, language));
    observer.observe(root, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: keyof typeof messages) => messages[key][language === "zh-CN" ? "zh" : "en"],
  }), [language, setLanguage]);

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  const value = useContext(UiLanguageContext);
  if (!value) throw new Error("useUiLanguage must be used inside UiLanguageProvider");
  return value;
}

export function UiLanguageToggle() {
  const { language, setLanguage, t } = useUiLanguage();
  return <div className="uiLanguageToggle" role="group" aria-label={t("language")}>
    <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
    <button type="button" className={language === "zh-CN" ? "active" : ""} onClick={() => setLanguage("zh-CN")} aria-pressed={language === "zh-CN"}>中文</button>
  </div>;
}
