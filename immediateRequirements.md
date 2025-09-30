Here’s a tight **UI/UX-only spec** of your **new immediate requirements** (looks + behavior, no code). This supersedes prior nav/stepper behavior where noted.

# 1) Global Layout

- **Top bar:** sticky, full-width.
- **Setup page = 100% width** split **25% / 75%**:

  - **Left 25%:** vertical nav (3 stacked buttons).
  - **Right 75%:** working area (content starts **immediately under** the top bar; no vertical centering; tight top/bottom padding).

# 2) Left Navigation (Setup)

Three stacked, full-width buttons with clear active state:

1. **CONNECT**
2. **GENERATE TEMPLATES**
3. **TEMPLATES**

- Clicking a button swaps the **right pane** content (no multi-section stacking).
- The left nav is for **navigation only**.

# 3) Stepper / Progress (Generate Templates only)

- Replace the old “wizard for everything” with a **non-interactive progress indicator** shown **only on the GENERATE TEMPLATES screen**.
- Steps shown (and auto-ticked as they complete):

  1. **Upload & Verify**
  2. **Generate Mapping** (inline loader)
  3. **Approve**

- It is **not** a navigator; it’s just status.

# 4) CONNECT screen (right pane)

**Top section: Connection form** (DB type/host/port/db/user/pass/SSL) with:

- **Test Connection** → inline success/fail message.
- **Save** (enabled only after a successful test) → confirmation toast.

**“Change Connection” visibility**

- Present here (obviously) but:
- Elsewhere in Setup, **“Change Connection” should appear only when creating a new template** (see §5) and **must not appear on TEMPLATES**.

**Saved Connections table** (below the form; appears once at least one connection exists)

- Columns: Name | DB Type | Host | Database | Status | Last Connected | Actions.
- Actions per row:

  - **Select** → sets active connection (confirmation if replacing current), success toast.
  - **Test** → runs connectivity; inline **“Test performed”** feedback + status chip update.
  - **Edit** → pre-fills form; saving updates row; toast on success.
  - **Delete** → confirm, then remove; toast on success.

# 5) GENERATE TEMPLATES screen (right pane)

**Purpose:** Create/verify a new template against the active connection.

- **Progress indicator** (see §3) pinned top of the pane.
- **Upload & Verify** in a single block:

  - Drag-drop/upload card.
  - **Verify Template** → modal with dim backdrop and stage progress; success = big tick + close to return.

- **Generate Mapping**:

  - On verify success, **Generate Mapping** button enables.
  - Clicking shows **inline loader panel** (not a modal) with determinate progress if available.

- **Approve**:

  - On mapping finish, open **Approve modal** (preview left, placeholders list right).
  - Approve & Save → adds template to **TEMPLATES** screen; success toast.

**“Change Connection” here only**

- A discreet **Change Connection** link/button appears on this screen **only** (since you’re creating a new template).
- Clicking it switches back to **CONNECT**, with a warning: _“Switching connections resets current upload/verification state.”_

# 6) TEMPLATES screen (right pane)

**Grid of larger cards** (responsive; 2–4 columns based on width):

- **Top: large thumbnail** (first page/sheet preview).
- **Heading (single line)** directly **below the thumbnail**.
- **Tags row** under the heading (chips).
- **File-type badge/dropdown** (PDF/Excel) at **top-right** of the card (readable at a glance).
- **Edit icon** at top-right of the card chrome — **dummy (non-functional)** for now.
- **No “Change Connection” anywhere** on this screen.

# 7) Navigation & Compatibility

- From **TEMPLATES**, selecting a card **does not** expose Change Connection.
- If user navigates to **GENERATE TEMPLATES** and changes connection mid-flow, mapping state resets as noted.
- (Optional but recommended message when opening a saved template with a different active connection in future: **schema compatibility check** banner; informational only.)

# 8) Feedback & Micro-interactions

- All actions surface immediate feedback:

  - **Test**: inline “Test performed” + status chip update.
  - **Save/Select/Delete/Approve**: brief toasts (success/error).

- Disabled states until prerequisites met (e.g., Save disabled until Test passes).
- Modals: focus-trapped; ESC closes non-critical; Approve requires explicit action.

# 9) Responsiveness

- Left nav remains 25% until \~≥1280px; below that, collapse to a **top row tabs/segmented control** or a **drawer** (keep behavior consistent).
- Card grid auto-wraps; thumbnails maintain aspect; headings truncate with tooltip.

# 10) Acceptance Checklist

- [ ] Setup uses **25% left nav / 75% right work area**, content top-aligned under sticky bar.
- [ ] Left nav shows **CONNECT / GENERATE TEMPLATES / TEMPLATES**; swaps right pane only.
- [ ] **Progress indicator** appears **only** on GENERATE TEMPLATES; steps tick automatically; not clickable.
- [ ] **Change Connection**:

  - Present on **CONNECT** (implicitly).
  - Present on **GENERATE TEMPLATES** (to allow switching mid-creation).
  - **Absent on TEMPLATES**.

- [ ] **Saved Connections table** with Select/Test/Edit/Delete and clear feedback (“Test performed”).
- [ ] **TEMPLATES** grid cards: big thumbnail → heading (one line) → tags; file-type badge/dropdown top-right; dummy **Edit** icon.
- [ ] All content starts **immediately under** the top bar; no vertical centering; minimized whitespace.

If you want, I can also drop a quick ASCII wireframe so your agent can mirror spacing and hierarchy exactly.
