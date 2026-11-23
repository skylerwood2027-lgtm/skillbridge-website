# /// script
# requires-python = ">=3.11"
# dependencies = ["python-docx==1.2.0"]
# ///
"""Builds the one-page high school resume template from David's Nov 22, 2026 Reel
(instagram.com/reel/DgEV_iNpvl5, keyword RESUME). The text is the template shown
in the video, word for word. Change it here, then re-run:

    uv run scripts/build-high-school-resume-template.py
"""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "resources" / "skillbridge-high-school-resume-template.docx"
FONT = "Times New Roman"
SIZE = 11
PAGE_W, MARGIN_X = 8.5, 0.6
TEXT_W = PAGE_W - 2 * MARGIN_X


def run(p, text, bold=False, italic=False, size=SIZE, sup=False):
    r = p.add_run(text)
    r.font.name = FONT
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.superscript = sup
    return r


def para(doc, align=None, before=0, after=0):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), 1.0
    if align is not None:
        p.alignment = align
    return p


def heading(doc, text):
    p = para(doc, before=7, after=3)
    p.paragraph_format.keep_with_next = True
    run(p, text, bold=True)
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "6"), ("space", "1"), ("color", "000000")):
        bottom.set(qn(f"w:{k}"), v)
    bdr.append(bottom)
    p._p.get_or_add_pPr().append(bdr)


def two_sided(doc, left, right, bold=False, italic=False, before=0):
    p = para(doc, before=before)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.tab_stops.add_tab_stop(Inches(TEXT_W), WD_TAB_ALIGNMENT.RIGHT)
    run(p, left, bold=bold, italic=italic)
    run(p, "\t")
    run(p, right, bold=bold, italic=italic)


def entry(doc, name, place, title, dates, bullets, before=4):
    two_sided(doc, name, place, bold=True, before=before)
    two_sided(doc, title, dates, italic=True)
    for i, (text, emphasis) in enumerate(bullets):
        p = doc.add_paragraph(style="List Bullet")
        pf = p.paragraph_format
        pf.left_indent, pf.first_line_indent = Inches(0.42), Inches(-0.17)
        pf.space_before, pf.space_after, pf.line_spacing = Pt(1 if i == 0 else 0), Pt(0), 1.0
        run(p, text, bold=emphasis, italic=emphasis)


def labeled(doc, parts):
    p = para(doc)
    for text, bold in parts:
        run(p, text, bold=bold)
    return p


def build():
    doc = Document()
    s = doc.sections[0]
    s.page_width, s.page_height = Inches(PAGE_W), Inches(11)
    s.left_margin = s.right_margin = Inches(MARGIN_X)
    s.top_margin = s.bottom_margin = Inches(0.55)
    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = FONT, Pt(SIZE)
    normal.element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)

    run(para(doc, WD_ALIGN_PARAGRAPH.CENTER, after=4), "Jane Doe", size=20)
    run(
        para(doc, WD_ALIGN_PARAGRAPH.CENTER, after=2),
        "San Jose, CA | 123.456.7890 | jane.doe@example.com | linkedin.com/in/janedoe",
    )

    heading(doc, "EDUCATION")
    two_sided(doc, "HIGH SCHOOL NAME", "City, ST", bold=True)
    two_sided(doc, "High School Diploma", "Expected June 2028", italic=True)
    labeled(doc, [("GPA: ", True), ("3.90 / 4.00 Unweighted, ", False), ("SAT: ", True), ("1500 / 1600 (only if it helps you)", False)])
    labeled(doc, [("Relevant Coursework: ", True), ("AP Statistics, AP Computer Science A, Honors Economics, Etc.", False)])
    p = labeled(doc, [("Honors & Awards: ", True), ("AP Scholar, Honor Roll (6 Semesters), 1", False)])
    run(p, "st", sup=True)
    run(p, " Place in XYZ Competition, Etc.")

    heading(doc, "WORK EXPERIENCE")
    entry(doc, "COMPANY NAME", "City, ST", "Position Title", "June 2026 – Present", [
        ("High level overview of what you do there, with your best highlight (promoted to shift lead, trusted to train new hires, etc.)", True),
        ("Start each bullet with an action verb (keep tenses consistent within one job: current job is present tense, past jobs are past tense)", False),
        ("Quantify what you did using a framework where you 1) name the problem, 2) say what you did about it, and 3) show the result with a number (customers, dollars, hours, people)", False),
    ], before=0)
    entry(doc, "COMPANY NAME", "City, ST", "Position Title", "June 2025 – August 2025", [
        ("High level overview of what you did, with your best highlight", True),
        ("Older or less relevant jobs get 1–2 bullets max (babysitting, tutoring, lifeguarding, and the family business all count if you did them regularly)", False),
    ])

    heading(doc, "PROJECTS")
    entry(doc, "PROJECT NAME", "Online", "Founder / Creator", "January 2026 – Present", [
        ("If you don’t have a job yet, anything you started on your own goes here (a small business, an app, a YouTube channel, a job simulation, etc.)", False),
        ("Give it a result someone can picture (followers, sales, downloads, users)", False),
    ], before=0)

    heading(doc, "EXTRACURRICULARS & LEADERSHIP")
    entry(doc, "CLUB OR ORGANIZATION NAME", "City, ST", "Position Title", "September 2025 – Present", [
        ("Highlight 1–2 roles where you led something, ideally connected to the path you want to go down", False),
        ("Say what changed because you were there (grew membership from 15 to 40, ran a fundraiser that raised $800, etc.)", False),
    ], before=0)
    entry(doc, "SPORT, ART, OR VOLUNTEER ACTIVITY", "City, ST", "Position Title", "September 2023 – Present", [
        ("Include 1 item that has nothing to do with a career so you come across as well-rounded (varsity soccer, cello, cooking, etc.)", False),
    ])

    heading(doc, "SKILLS, CERTIFICATIONS & INTERESTS")
    labeled(doc, [("Skills: ", True), ("Google Sheets, Canva, Python (Basic), Spanish (Conversational), Etc.", False)])
    labeled(doc, [("Certifications: ", True), ("HubSpot Content Marketing, Google Analytics, CPR / First Aid, Etc.", False)])
    labeled(doc, [("Interests: ", True), ("Something Specific (“Restored a 1998 Honda Civic,” Not “Cars”), Something That Starts a Conversation, Etc.", False)])

    run(para(doc, WD_ALIGN_PARAGRAPH.CENTER, before=14), "Keep it to one page, and leave off the photo and “References available upon request.”", italic=True, size=9.5)
    run(para(doc, WD_ALIGN_PARAGRAPH.CENTER), "High school resume template by SkillBridge (joinskillbridge.com)", italic=True, size=9.5)

    core = doc.core_properties
    core.title = "SkillBridge High School Resume Template"
    core.subject = "One-page high school resume template with instructions in every section"
    core.author = "SkillBridge"
    core.keywords = "high school resume, student resume, resume template, SkillBridge"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
