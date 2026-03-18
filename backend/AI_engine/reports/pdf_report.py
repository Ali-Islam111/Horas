# ==============================================================
# reports/pdf_report.py  —  Full Session Evidence Report
# ==============================================================
#
# Sections generated:
#   1. Cover page          — session info, student photo, severity badge
#   2. Executive summary   — key statistics at a glance
#   3. Event summary table — counts per event type, colour-coded
#   4. Attention timeline  — unicode sparkline + min/max/avg stats
#   5. Detector breakdown  — per-detector metric summary table
#                            (Screen Glow shows 4-signal breakdown)
#   6. Detailed event log  — every event with timestamp, details,
#                            transcript (if audio), screenshot
#   7. Appendix            — reference identity photo (if enrolled)
#
# Changes vs original:
#   - AUDIO events: transcript extracted from details string and
#     rendered as its own highlighted row below the event header
#   - Screen Glow detector stats: shows the 4-signal fusion breakdown
#     (brightness_spike, saturation_drop, flicker, blue_excess,
#      n_signals, v_delta, v_variance) when available
#   - Detector stats section: nested dict values (like signals{})
#     are expanded into sub-rows instead of printing raw repr()
#   - _parse_transcript() helper isolates transcript parsing logic
# ==============================================================

import os
from datetime import datetime
from collections import Counter

import config

try:
    from reportlab.lib.pagesizes     import A4
    from reportlab.lib               import colors
    from reportlab.lib.units         import cm, mm
    from reportlab.lib.styles        import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus          import (
        SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
        HRFlowable, PageBreak, KeepTogether,
    )
    from reportlab.lib.enums         import TA_CENTER, TA_RIGHT, TA_LEFT
    from reportlab.pdfgen            import canvas as rl_canvas
    _RL = True
except ImportError:
    _RL = False
    print("[Report] reportlab not installed — PDF generation disabled.")


# ── Colour helpers ────────────────────────────────────────────
def _hex(h: str):
    h = h.lstrip("#")
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    return colors.Color(r/255, g/255, b/255)

_C = {k: _hex(v) for k, v in config.REPORT_COLORS.items()} if _RL else {}
_CAT_C = {k: _hex(v) for k, v in config.CATEGORY_COLORS.items()} if _RL else {}


# ── Transcript extractor ─────────────────────────────────────
def _parse_transcript(details: str) -> tuple[str, str]:
    """
    Split an AUDIO event's details string into (clean_details, transcript).

    audio.py builds details like:
        'confidence=0.85 | transcript="what is Q3"'
    or  'confidence=0.72'   (no transcript)

    Returns (details_without_transcript, transcript_text_or_empty).
    """
    transcript = ""
    clean      = details
    if "transcript=" in details:
        parts = details.split(" | transcript=", 1)
        clean = parts[0].strip()
        if len(parts) > 1:
            transcript = parts[1].strip().strip('"')
    return clean, transcript


# ── Sparkline ────────────────────────────────────────────────
def _sparkline(history: list[tuple], width: int = 90) -> str:
    BLOCKS = " ▁▂▃▄▅▆▇█"
    scores = [s for _, s in history]
    if not scores:
        return "(no data)"
    mn, mx = min(scores), max(scores)
    rng    = mx - mn or 1
    step   = max(1, len(scores) // width)
    return "".join(
        BLOCKS[int((scores[i] - mn) / rng * (len(BLOCKS) - 1))]
        for i in range(0, len(scores), step)
    )


# ── Page decorator (header / footer on every page) ───────────
class _Decorator:
    def __init__(self, session_id: str, student: str):
        self._sid = session_id
        self._stu = student

    def __call__(self, cv, doc):
        W, H = A4
        cv.saveState()
        # Top bar
        cv.setFillColor(_hex(config.REPORT_COLORS["primary"]))
        cv.rect(0, H - 28*mm, W, 28*mm, fill=1, stroke=0)
        cv.setFont("Helvetica-Bold", 11)
        cv.setFillColor(colors.white)
        cv.drawString(18*mm, H - 16*mm, config.REPORT_LOGO_TEXT)
        cv.setFont("Helvetica", 8)
        cv.drawRightString(W - 18*mm, H - 16*mm,
                           f"Session {self._sid}  ·  {self._stu}")
        # Bottom bar
        cv.setFillColor(_hex(config.REPORT_COLORS["border"]))
        cv.rect(0, 0, W, 12*mm, fill=1, stroke=0)
        cv.setFont("Helvetica", 7)
        cv.setFillColor(_hex(config.REPORT_COLORS["muted"]))
        cv.drawString(18*mm, 4.5*mm,
                      f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ·  "
                      "AI Proctoring System  ·  Confidential")
        cv.drawRightString(W - 18*mm, 4.5*mm, f"Page {doc.page}")
        cv.restoreState()


# ── Main generator ────────────────────────────────────────────
def generate(
    events:           list[dict],
    session_id:       str,
    student_name:     str               = "Unknown",
    start_time:       str               = "",
    end_time:         str               = "",
    reference_image:  "str | None"      = None,
    attention_history:"list[tuple]"     = None,
    detector_stats:   "dict | None"     = None,
) -> "str | None":
    """
    Build the full PDF evidence report.

    events        : list of dicts from EventLogger.events
    detector_stats: optional dict of final per-detector readings
                    e.g. {"Head Pose": {...}, "Screen Glow": {...}, ...}
    Returns the path of the generated PDF, or None on failure.
    """
    if not _RL:
        print("[Report] Cannot generate — reportlab not installed.")
        return None

    attention_history = attention_history or []

    # ── Sanitize events — guard against malformed dicts ─────
    # Any missing key in any event dict crashes Counter/max() downstream.
    # Normalize every event to have all required fields with safe defaults.
    clean_events = []
    for ev in (events or []):
        if not isinstance(ev, dict):
            continue
        clean_events.append({
            "source":     str(ev.get("source",     "SYS")),
            "event_type": str(ev.get("event_type", "Unknown")),
            "timestamp":  str(ev.get("timestamp",  "")),
            "details":    str(ev.get("details",    "")),
            "severity":   int(ev.get("severity",   1)),
            "screenshot": str(ev.get("screenshot", "") or ""),
        })
    events = clean_events

    # Pre-calculate severity counts here so they are in scope for ALL sections.
    # Previously n_crit was calculated inside Section 1 (cover page) but
    # referenced again in Section 2 (attention row) — if Section 1 raised
    # an exception n_crit was undefined when Section 2 ran.
    n_crit = sum(1 for e in events if e["severity"] >= 3)
    n_high = sum(1 for e in events if e["severity"] == 2)
    n_low  = sum(1 for e in events if e["severity"] == 1)

    fname   = (f"report_{session_id}_"
               f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
    outpath = os.path.join(config.REPORTS_DIR, fname)

    W, H = A4
    doc  = SimpleDocTemplate(
        outpath, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=34*mm,  bottomMargin=18*mm,
    )
    decorator = _Decorator(session_id, student_name)

    # ── Styles ──────────────────────────────────────────────
    styles = getSampleStyleSheet()
    S      = lambda name, **kw: ParagraphStyle(name, parent=styles["Normal"], **kw)

    st_title      = S("t",  fontSize=26, fontName="Helvetica-Bold",
                       textColor=_C["primary"], spaceAfter=4, leading=30)
    st_sub        = S("s",  fontSize=11, textColor=_C["muted"],  spaceAfter=14)
    st_h2         = S("h2", fontSize=14, fontName="Helvetica-Bold",
                       textColor=_C["primary"], spaceBefore=14, spaceAfter=6)
    st_h3         = S("h3", fontSize=11, fontName="Helvetica-Bold",
                       textColor=_C["primary"], spaceBefore=8, spaceAfter=4)
    st_body       = S("b",  fontSize=9,  leading=13, textColor=_C["primary"])
    st_mono       = S("m",  fontSize=8,  fontName="Courier",
                       leading=11, textColor=_C["primary"])
    st_caption    = S("c",  fontSize=8,  textColor=_C["muted"],
                       alignment=TA_CENTER, spaceBefore=2, spaceAfter=8)
    st_center     = S("cc", fontSize=9,  alignment=TA_CENTER)
    # NEW: transcript highlight style
    st_transcript = S("tr", fontSize=9, fontName="Helvetica-Oblique",
                       textColor=_hex(config.REPORT_COLORS["accent2"]),
                       leftIndent=10, spaceBefore=2, spaceAfter=4,
                       leading=13)

    elems = []

    # ════════════════════════════════════════════════════════
    # 1. COVER PAGE
    # ════════════════════════════════════════════════════════
    elems.append(Spacer(1, 18*mm))
    elems.append(Paragraph("Examination Integrity Report", st_title))
    elems.append(Paragraph("AI-Powered Proctoring · Full Session Evidence", st_sub))
    elems.append(HRFlowable(width="100%", thickness=2,
                             color=_C["accent"], spaceAfter=12))

    # Session info table
    duration = ""
    if start_time and end_time:
        try:
            fmt = "%Y-%m-%d %H:%M:%S"
            d   = datetime.strptime(end_time, fmt) - datetime.strptime(start_time, fmt)
            m, s= divmod(int(d.total_seconds()), 60)
            h, m= divmod(m, 60)
            duration = f"{h:02d}:{m:02d}:{s:02d}"
        except Exception:
            duration = "—"

    info_rows = [
        ["Session ID",    session_id,    "Start Time",  start_time or "—"],
        ["Student",       student_name,  "End Time",    end_time   or "—"],
        ["Total Events",  str(len(events)),"Duration",  duration   or "—"],
    ]
    info_tbl = Table(info_rows, colWidths=[3.8*cm, 5.8*cm, 3.8*cm, 5.8*cm])
    info_tbl.setStyle(TableStyle([
        ("FONTNAME",   (0,0),(0,-1), "Helvetica-Bold"),
        ("FONTNAME",   (2,0),(2,-1), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9),
        ("BACKGROUND", (0,0),(0,-1), _C["light_bg"]),
        ("BACKGROUND", (2,0),(2,-1), _C["light_bg"]),
        ("GRID",       (0,0),(-1,-1), 0.4, _C["border"]),
        ("PADDING",    (0,0),(-1,-1), 6),
        ("ROWBACKGROUNDS", (0,0),(-1,-1),
         [colors.white, _hex(config.REPORT_COLORS["light_bg"])]),
    ]))
    elems.append(info_tbl)
    elems.append(Spacer(1, 10*mm))

    # Severity badge
    # n_crit/n_high/n_low already computed at top of generate()
    sev_txt = (f"CRITICAL: {n_crit}  ·  HIGH: {n_high}  ·  LOW: {n_low}  ·  "
               f"TOTAL: {len(events)}")
    badge_color = _C["accent"] if n_crit > 0 else (
        _hex(config.REPORT_COLORS["yellow"]) if n_high > 0 else _C["teal"])
    badge_tbl = Table([[sev_txt]], colWidths=[W - 36*mm])
    badge_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), badge_color),
        ("TEXTCOLOR",  (0,0),(-1,-1), colors.white),
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 10),
        ("ALIGN",      (0,0),(-1,-1), "CENTER"),
        ("PADDING",    (0,0),(-1,-1), 8),
        ("RADIUS",     (0,0),(-1,-1), 4),
    ]))
    elems.append(badge_tbl)
    elems.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 2. EXECUTIVE SUMMARY
    # ════════════════════════════════════════════════════════
    elems.append(Paragraph("Executive Summary", st_h2))
    elems.append(HRFlowable(width="100%", thickness=1,
                             color=_C["border"], spaceAfter=8))

    source_counts = Counter(e["source"] for e in events)
    attn_scores   = [s for _, s in attention_history]
    attn_min  = f"{min(attn_scores):.1f}"  if attn_scores else "—"
    attn_avg  = f"{sum(attn_scores)/len(attn_scores):.1f}" if attn_scores else "—"
    attn_end  = f"{attn_scores[-1]:.1f}"   if attn_scores else "—"

    # Count audio events that have transcripts (new in zip2)
    n_transcribed = sum(
        1 for e in events
        if e.get("source") == "AUDIO" and "transcript=" in e.get("details", "")
    )

    summary_rows = [["Detector", "Events", "Detector", "Events"]]
    items = list(source_counts.items())
    if len(items) % 2: items.append(("", ""))
    for i in range(0, len(items), 2):
        r = [items[i][0], str(items[i][1])]
        if i+1 < len(items):
            r += [items[i+1][0], str(items[i+1][1])]
        else:
            r += ["", ""]
        summary_rows.append(r)

    sum_tbl = Table(summary_rows, colWidths=[5*cm, 2.5*cm, 5*cm, 2.5*cm])
    sum_tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0,0),(-1,0), _C["primary"]),
        ("TEXTCOLOR",      (0,0),(-1,0), colors.white),
        ("FONTNAME",       (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTNAME",       (0,1),(-1,-1),"Helvetica"),
        ("FONTSIZE",       (0,0),(-1,-1), 9),
        ("ALIGN",          (1,0),(1,-1), "CENTER"),
        ("ALIGN",          (3,0),(3,-1), "CENTER"),
        ("GRID",           (0,0),(-1,-1), 0.4, _C["border"]),
        ("ROWBACKGROUNDS", (0,1),(-1,-1),
         [colors.white, _hex(config.REPORT_COLORS["light_bg"])]),
        ("PADDING",        (0,0),(-1,-1), 6),
    ]))
    elems.append(sum_tbl)
    elems.append(Spacer(1, 8))

    # Attention + transcript stats row
    attn_row = Table(
        [[f"Attention Min: {attn_min}",
          f"Attention Avg: {attn_avg}",
          f"Attention End: {attn_end}",
          f"Critical Events: {n_crit}",
          f"Transcribed Speech: {n_transcribed}"]],
        colWidths=[(W-36*mm)/5]*5,
    )
    attn_row.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), _C["light_bg"]),
        ("FONTNAME",   (0,0),(-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 9),
        ("ALIGN",      (0,0),(-1,-1), "CENTER"),
        ("GRID",       (0,0),(-1,-1), 0.4, _C["border"]),
        ("PADDING",    (0,0),(-1,-1), 7),
    ]))
    elems.append(attn_row)
    elems.append(Spacer(1, 12))

    # ════════════════════════════════════════════════════════
    # 3. EVENT SUMMARY TABLE  (by event type)
    # ════════════════════════════════════════════════════════
    elems.append(Paragraph("Event Type Breakdown", st_h2))
    elems.append(HRFlowable(width="100%", thickness=1,
                             color=_C["border"], spaceAfter=8))

    type_counts = Counter(
        (e["source"], e["event_type"]) for e in events)
    tbl_data = [["Category", "Event Type", "Count", "Severity"]]
    for (src, evt), cnt in sorted(type_counts.items(), key=lambda x: -x[1]):
        sev_label = max((e["severity"] for e in events
                         if e["source"]==src and e["event_type"]==evt), default=1)
        sev_str   = {1:"LOW", 2:"HIGH", 3:"CRITICAL",
                     4:"CRITICAL", 5:"CRITICAL"}.get(sev_label, "—")
        tbl_data.append([src, evt, str(cnt), sev_str])

    col_w = [(W-36*mm)*f for f in [0.18, 0.52, 0.12, 0.18]]
    ev_tbl = Table(tbl_data, colWidths=col_w)
    ev_styles = [
        ("BACKGROUND", (0,0),(-1,0), _C["primary"]),
        ("TEXTCOLOR",  (0,0),(-1,0), colors.white),
        ("FONTNAME",   (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",   (0,0),(-1,-1), 8),
        ("GRID",       (0,0),(-1,-1), 0.4, _C["border"]),
        ("ROWBACKGROUNDS", (0,1),(-1,-1),
         [colors.white, _hex(config.REPORT_COLORS["light_bg"])]),
        ("PADDING",    (0,0),(-1,-1), 5),
        ("ALIGN",      (2,0),(3,-1), "CENTER"),
    ]
    for i, row in enumerate(tbl_data[1:], 1):
        sev = row[3]
        col = ({"CRITICAL": _C["accent"],
                "HIGH":     _hex(config.REPORT_COLORS["yellow"]),
                "LOW":      _C["teal"]}
               .get(sev, _C["muted"]))
        ev_styles.append(("TEXTCOLOR", (3,i),(3,i), col))
        ev_styles.append(("FONTNAME",  (3,i),(3,i), "Helvetica-Bold"))
    ev_tbl.setStyle(TableStyle(ev_styles))
    elems.append(ev_tbl)
    elems.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 4. ATTENTION SCORE TIMELINE
    # ════════════════════════════════════════════════════════
    elems.append(Paragraph("Attention Score Timeline", st_h2))
    elems.append(HRFlowable(width="100%", thickness=1,
                             color=_C["border"], spaceAfter=8))

    if attention_history:
        spark = _sparkline(attention_history)
        elems.append(Paragraph(spark, st_mono))
        elems.append(Spacer(1, 4))
        elems.append(Paragraph(
            f"↑ 100 (max attentive)  →  timeline ({len(attention_history)} ticks)"
            f"  →  {attn_end} (session end)",
            st_caption))

        band_data = [["Band", "Score Range", "Ticks", "% of Session"]]
        total = len(attn_scores)
        for label, lo, hi, col_key in [
            ("Attentive",   70, 100, "green"),
            ("Distracted",  45,  69, "yellow"),
            ("Suspicious",   0,  44, "accent"),
        ]:
            cnt = sum(1 for s in attn_scores if lo <= s <= hi)
            band_data.append([
                label,
                f"{lo} – {hi}",
                str(cnt),
                f"{100*cnt/max(total,1):.1f}%",
            ])
        band_tbl = Table(band_data, colWidths=[4*cm,4*cm,3*cm,3*cm])
        band_styles = [
            ("BACKGROUND", (0,0),(-1,0), _C["primary"]),
            ("TEXTCOLOR",  (0,0),(-1,0), colors.white),
            ("FONTNAME",   (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",   (0,0),(-1,-1), 9),
            ("GRID",       (0,0),(-1,-1), 0.4, _C["border"]),
            ("ALIGN",      (2,0),(3,-1), "CENTER"),
            ("PADDING",    (0,0),(-1,-1), 6),
        ]
        for i, (_, _, _, ck) in enumerate([
            ("","","","green"),("","","","yellow"),("","","","accent")], 1):
            band_styles.append(("TEXTCOLOR", (0,i),(0,i), _C[ck]))
            band_styles.append(("FONTNAME",  (0,i),(0,i), "Helvetica-Bold"))
        band_tbl.setStyle(TableStyle(band_styles))
        elems.append(Spacer(1, 6))
        elems.append(band_tbl)
    else:
        elems.append(Paragraph("No attention history recorded.", st_body))

    elems.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════════
    # 5. DETECTOR METRICS SUMMARY
    # ════════════════════════════════════════════════════════
    if detector_stats:
        elems.append(Paragraph("Final Detector Readings", st_h2))
        elems.append(HRFlowable(width="100%", thickness=1,
                                 color=_C["border"], spaceAfter=8))
        for det_name, stats in detector_stats.items():
            if not stats:
                continue
            elems.append(Paragraph(det_name.upper(), st_h3))

            rows = []
            for k, v in stats.items():
                if isinstance(v, dict):
                    rows.append([f"  {k}", ""])
                    for sk, sv in v.items():
                        # Guard against None values from untrained models
                        if sv is None:
                            val_str = "—"
                        elif isinstance(sv, float):
                            val_str = str(round(sv, 4))
                        else:
                            val_str = str(sv)
                        rows.append([f"    · {sk}", val_str])
                else:
                    # Guard against None values (e.g. IForest score before training)
                    if v is None:
                        val_str = "—"
                    elif isinstance(v, float):
                        val_str = str(round(v, 4))
                    else:
                        val_str = str(v)
                    rows.append([k, val_str])

            if rows:
                dt = Table(rows, colWidths=[6*cm, 9*cm])
                dt_styles = [
                    ("FONTSIZE",  (0,0),(-1,-1), 8),
                    ("FONTNAME",  (0,0),(0,-1), "Helvetica-Bold"),
                    ("GRID",      (0,0),(-1,-1), 0.3, _C["border"]),
                    ("ROWBACKGROUNDS", (0,0),(-1,-1),
                     [colors.white, _hex(config.REPORT_COLORS["light_bg"])]),
                    ("PADDING",   (0,0),(-1,-1), 4),
                ]
                # Style the sub-header rows (nested dict keys) differently
                for ri, row in enumerate(rows):
                    if row[1] == "" and row[0].startswith("  "):
                        dt_styles.append(
                            ("BACKGROUND", (0,ri),(-1,ri),
                             _hex(config.REPORT_COLORS["primary"])))
                        dt_styles.append(
                            ("TEXTCOLOR", (0,ri),(-1,ri), colors.white))
                        dt_styles.append(
                            ("FONTNAME", (0,ri),(-1,ri), "Helvetica-Bold"))
                        dt_styles.append(
                            ("SPAN", (0,ri),(-1,ri)))
                dt.setStyle(TableStyle(dt_styles))
                elems.append(dt)
                elems.append(Spacer(1, 6))
        elems.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 6. DETAILED EVENT LOG WITH SCREENSHOTS
    # ════════════════════════════════════════════════════════
    elems.append(Paragraph("Detailed Event Log with Evidence", st_h2))
    elems.append(HRFlowable(width="100%", thickness=1,
                             color=_C["border"], spaceAfter=8))

    for i, ev in enumerate(events, 1):
        src   = ev.get("source", "SYS")
        etype = ev.get("event_type", "")
        ts    = ev.get("timestamp", "")
        det   = ev.get("details", "")
        sev   = ev.get("severity", 1)
        snap  = ev.get("screenshot", "")

        # For AUDIO events, extract transcript from details string
        transcript = ""
        if src == "AUDIO" and det:
            det, transcript = _parse_transcript(det)

        cat_color = _CAT_C.get(src, _C["muted"])
        sev_color = ({5: _C["accent"], 4: _C["accent"], 3: _C["accent"],
                      2: _hex(config.REPORT_COLORS["yellow"])}.get(sev, _C["teal"]))

        header_data = [[
            Paragraph(f"<b>#{i:03d}</b>", st_body),
            Paragraph(f"<b>{src}</b>", ParagraphStyle(
                "hd", fontSize=8, fontName="Helvetica-Bold",
                textColor=cat_color)),
            Paragraph(etype, st_body),
            Paragraph(ts, ParagraphStyle(
                "ts", fontSize=8, textColor=_C["muted"],
                alignment=TA_RIGHT)),
            Paragraph(
                {1:"LOW",2:"HIGH",3:"CRIT",4:"CRIT",5:"CRIT"}.get(sev,"—"),
                ParagraphStyle("sv", fontSize=8, fontName="Helvetica-Bold",
                               textColor=sev_color, alignment=TA_RIGHT)),
        ]]
        hdr_tbl = Table(header_data,
                        colWidths=[1.0*cm, 2.4*cm, 7.2*cm, 4.0*cm, 1.4*cm])
        hdr_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), _C["light_bg"]),
            ("GRID",       (0,0),(-1,-1), 0.3, _C["border"]),
            ("PADDING",    (0,0),(-1,-1), 5),
            ("VALIGN",     (0,0),(-1,-1), "MIDDLE"),
        ]))

        block = [hdr_tbl]

        # Details line (confidence etc.)
        if det:
            block.append(Paragraph(f"<i>{det}</i>",
                ParagraphStyle("det", fontSize=8, textColor=_C["muted"],
                               leftIndent=8, spaceBefore=2, spaceAfter=2)))

        # Transcript line — highlighted, only for AUDIO events
        if transcript:
            transcript_safe = transcript.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            block.append(
                Table(
                    [[Paragraph(f'🎤  "{transcript_safe}"', st_transcript)]],
                    colWidths=[W - 36*mm],
                )
            )
            block[-1].setStyle(TableStyle([
                ("BACKGROUND", (0,0),(-1,-1),
                 _hex(config.REPORT_COLORS["accent2"] + "22")),
                ("LEFTPADDING",  (0,0),(-1,-1), 10),
                ("RIGHTPADDING", (0,0),(-1,-1), 10),
                ("TOPPADDING",   (0,0),(-1,-1), 4),
                ("BOTTOMPADDING",(0,0),(-1,-1), 4),
            ]))

        if snap and os.path.exists(snap):
            try:
                img = Image(snap, width=10*cm, height=7.5*cm)
                img.hAlign = "LEFT"
                block.append(img)
                block.append(Paragraph(f"Evidence: {os.path.basename(snap)}",
                                        st_caption))
            except Exception:
                pass
        block.append(Spacer(1, 6))
        elems.append(KeepTogether(block))

    # ════════════════════════════════════════════════════════
    # 7. APPENDIX — Reference Identity Photo
    # ════════════════════════════════════════════════════════
    if reference_image and os.path.exists(reference_image):
        elems.append(PageBreak())
        elems.append(Paragraph("Appendix: Reference Identity Photo", st_h2))
        elems.append(HRFlowable(width="100%", thickness=1,
                                 color=_C["border"], spaceAfter=12))
        elems.append(Paragraph(
            "Captured during enrollment at session start. "
            "Used as reference for ArcFace identity verification "
            "throughout the exam.", st_body))
        elems.append(Spacer(1, 8))
        try:
            ref_img = Image(reference_image, width=8*cm, height=6*cm)
            ref_img.hAlign = "LEFT"
            elems.append(ref_img)
            elems.append(Paragraph(
                f"File: {os.path.basename(reference_image)}", st_caption))
        except Exception:
            pass

    # ── Build ────────────────────────────────────────────────
    try:
        doc.build(elems,
                  onFirstPage=decorator,
                  onLaterPages=decorator)
        print(f"\n  [Report] PDF generated → {outpath}")
        return outpath
    except Exception as e:
        import traceback
        print(f"\n  [Report] Build failed: {e}")
        traceback.print_exc()   # print full stack so we can see the real cause
        return None
