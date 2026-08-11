const state = {
  records: [],
  query: "",
  industry: "",
  location: "",
  type: "",
  quick: "all",
  sort: "open-desc",
};

const elements = {
  totalCount: document.querySelector("#totalCount"),
  urgentCount: document.querySelector("#urgentCount"),
  verifiedCount: document.querySelector("#verifiedCount"),
  updatedAt: document.querySelector("#updatedAt"),
  resultCount: document.querySelector("#resultCount"),
  activeFilterLabel: document.querySelector("#activeFilterLabel"),
  results: document.querySelector("#results"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  industryFilter: document.querySelector("#industryFilter"),
  locationFilter: document.querySelector("#locationFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  filters: document.querySelector(".filters"),
  mobileFilterToggle: document.querySelector("#mobileFilterToggle"),
};

function drawBrandMark() {
  const canvas = document.querySelector("#brandMark");
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f3b33d";
  context.fillRect(8, 14, 72, 64);
  context.fillStyle = "#102a43";
  context.fillRect(8, 14, 72, 17);
  context.fillStyle = "#ffffff";
  context.font = "700 30px Microsoft YaHei, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("27", 44, 55);
  context.fillStyle = "#ffffff";
  context.fillRect(22, 8, 7, 16);
  context.fillRect(59, 8, 7, 16);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exactDate(value) {
  const match = String(value || "").match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayDifference(deadline) {
  const parsed = exactDate(deadline);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.round((parsed - today) / 86400000);
}

function deadlineState(record) {
  const diff = dayDifference(record.deadline);
  const status = `${record.status} ${record.priority}`;
  if (/已截止|关闭/.test(status) || (diff !== null && diff < 0)) return "closed";
  if (diff !== null && diff <= 7) return "urgent";
  if (diff !== null && diff <= 30) return "soon";
  return "normal";
}

function statusLabel(record) {
  const diff = dayDifference(record.deadline);
  const kind = deadlineState(record);
  if (kind === "closed") return "已截止";
  if (diff === 0) return "今日截止";
  if (diff === 1) return "明日截止";
  if (diff !== null && diff <= 7) return `${diff}天后截止`;
  if (diff !== null && diff <= 30) return `${diff}天后截止`;
  return record.status || "开放中";
}

function verificationLevel(value) {
  const level = String(value || "").charAt(0).toUpperCase();
  return ["A", "B", "C"].includes(level) ? level : "B";
}

function isNoTest(record) {
  const text = String(record.writtenTest || "");
  return /免笔试|直通面试|部分免/.test(text) && !/不等于免笔试/.test(text);
}

function openDateRank(value) {
  const parsed = exactDate(value);
  return parsed ? parsed.getTime() : 0;
}

function deadlineRank(value) {
  const parsed = exactDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

function matchesLocation(record, location) {
  if (!location) return true;
  return String(record.location || "").includes(location);
}

function filteredRecords() {
  const query = state.query.trim().toLowerCase();
  const rows = state.records.filter((record) => {
    const haystack = [record.company, record.industry, record.location, record.roles, record.recruitmentType].join(" ").toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (state.industry && record.industry !== state.industry) return false;
    if (!matchesLocation(record, state.location)) return false;
    if (state.type && !String(record.recruitmentType || "").includes(state.type)) return false;
    if (state.quick === "urgent" && deadlineState(record) !== "urgent") return false;
    if (state.quick === "verified" && verificationLevel(record.verification) !== "A") return false;
    if (state.quick === "no-test" && !isNoTest(record)) return false;
    return true;
  });

  return rows.sort((a, b) => {
    if (state.sort === "deadline-asc") return deadlineRank(a.deadline) - deadlineRank(b.deadline);
    if (state.sort === "company-asc") return String(a.company).localeCompare(String(b.company), "zh-CN");
    return openDateRank(b.openDate) - openDateRank(a.openDate) || String(a.company).localeCompare(String(b.company), "zh-CN");
  });
}

function cardTemplate(record) {
  const kind = deadlineState(record);
  const level = verificationLevel(record.verification);
  const hasOfficialApplyUrl = /^https?:\/\//.test(record.applyUrl);
  const applyAction = hasOfficialApplyUrl
    ? `<a class="apply-button" href="${escapeHtml(record.applyUrl)}" target="_blank" rel="noopener noreferrer">
        立即投递 <span aria-hidden="true">↗</span>
      </a>`
    : `<span class="apply-button is-disabled" aria-disabled="true">官方入口待核验</span>`;
  const sourceUrl = /^https?:\/\//.test(record.sourceUrl) ? record.sourceUrl : "#";
  return `
    <article class="job-card ${kind === "urgent" ? "is-urgent" : ""} ${kind === "closed" ? "is-expired" : ""}">
      <div class="job-main">
        <div class="job-topline">
          <div class="company-block">
            <h3 class="company-name">${escapeHtml(record.company)}</h3>
            <span class="industry">${escapeHtml(record.industry)}</span>
          </div>
          <span class="status-badge ${kind}">${escapeHtml(statusLabel(record))}</span>
        </div>
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">工作地点</span>
            <span class="meta-value">${escapeHtml(record.location || "以岗位页为准")}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">招聘类型</span>
            <span class="meta-value">${escapeHtml(record.recruitmentType)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">截止时间</span>
            <span class="meta-value">${escapeHtml(record.deadline)}</span>
          </div>
        </div>
        <p class="roles">${escapeHtml(record.roles)}</p>
        <div class="card-actions">
          <span class="verification">
            <span class="level level-${level.toLowerCase()}">${level}</span>
            <span>${escapeHtml(record.verification)}</span>
          </span>
          ${applyAction}
        </div>
      </div>
      <details class="details">
        <summary>项目详情</summary>
        <div class="details-content">
          <div class="detail-row"><strong>开放时间</strong><p>${escapeHtml(record.openDate)}</p></div>
          <div class="detail-row"><strong>面向人群</strong><p>${escapeHtml(record.audience)}</p></div>
          <div class="detail-row"><strong>笔试政策</strong><p>${escapeHtml(record.writtenTest)}</p></div>
          <div class="detail-row"><strong>企业性质</strong><p>${escapeHtml(record.nature)}</p></div>
          <div class="detail-row"><strong>注意事项</strong><p>${escapeHtml(record.notes || "以岗位公告为准")}</p></div>
          <div class="detail-row"><strong>信息来源</strong><p><a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a></p></div>
        </div>
      </details>
    </article>`;
}

function activeFilterText() {
  const labels = [];
  if (state.quick === "urgent") labels.push("7天内截止");
  if (state.quick === "verified") labels.push("A等级");
  if (state.quick === "no-test") labels.push("免笔试");
  if (state.industry) labels.push(state.industry);
  if (state.location) labels.push(state.location);
  if (state.type) labels.push(state.type);
  if (state.query) labels.push(`“${state.query}”`);
  return labels.length ? labels.join(" · ") : "全部开放项目";
}

function render() {
  const rows = filteredRecords();
  elements.results.innerHTML = rows.map(cardTemplate).join("");
  elements.resultCount.textContent = rows.length;
  elements.activeFilterLabel.textContent = activeFilterText();
  elements.emptyState.hidden = rows.length !== 0;
}

function resetFilters() {
  state.query = "";
  state.industry = "";
  state.location = "";
  state.type = "";
  state.quick = "all";
  state.sort = "open-desc";
  elements.searchInput.value = "";
  elements.industryFilter.value = "";
  elements.locationFilter.value = "";
  elements.typeFilter.value = "";
  elements.sortSelect.value = "open-desc";
  document.querySelectorAll("[data-quick]").forEach((button) => button.classList.toggle("is-active", button.dataset.quick === "all"));
  render();
}

function populateSelect(select, values) {
  const fragment = document.createDocumentFragment();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.appendChild(option);
  });
  select.appendChild(fragment);
}

function topLocations(records) {
  const cities = ["北京", "上海", "深圳", "广州", "杭州", "南京", "成都", "苏州", "武汉", "西安", "合肥", "天津", "长沙", "重庆"];
  return cities.filter((city) => records.some((record) => String(record.location || "").includes(city)));
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => { state.query = event.target.value; render(); });
  elements.industryFilter.addEventListener("change", (event) => { state.industry = event.target.value; render(); });
  elements.locationFilter.addEventListener("change", (event) => { state.location = event.target.value; render(); });
  elements.typeFilter.addEventListener("change", (event) => { state.type = event.target.value; render(); });
  elements.sortSelect.addEventListener("change", (event) => { state.sort = event.target.value; render(); });
  document.querySelectorAll("[data-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      state.quick = button.dataset.quick;
      document.querySelectorAll("[data-quick]").forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });
  document.querySelector("#resetFilters").addEventListener("click", resetFilters);
  document.querySelector("#emptyReset").addEventListener("click", resetFilters);
  elements.mobileFilterToggle.addEventListener("click", () => {
    const open = elements.filters.classList.toggle("is-open");
    elements.mobileFilterToggle.setAttribute("aria-expanded", String(open));
  });
}

async function init() {
  drawBrandMark();
  const response = await fetch("data.json", { cache: "no-store" });
  if (!response.ok) throw new Error("无法读取招聘数据");
  const data = await response.json();
  state.records = data.records;
  const industries = [...new Set(state.records.map((record) => record.industry).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  populateSelect(elements.industryFilter, industries);
  populateSelect(elements.locationFilter, topLocations(state.records));
  elements.totalCount.textContent = state.records.length;
  elements.urgentCount.textContent = state.records.filter((record) => deadlineState(record) === "urgent").length;
  elements.verifiedCount.textContent = state.records.filter((record) => verificationLevel(record.verification) === "A").length;
  elements.updatedAt.textContent = data.updatedAt;
  bindEvents();
  render();
}

init().catch((error) => {
  elements.results.innerHTML = `<div class="empty-state"><strong>${escapeHtml(error.message)}</strong></div>`;
});
