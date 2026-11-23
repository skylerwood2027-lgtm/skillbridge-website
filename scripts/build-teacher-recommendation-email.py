# /// script
# requires-python = ">=3.11"
# dependencies = ["python-docx==1.2.0"]
# ///
"""Builds the 10/10 teacher recommendation email template (keyword EMAIL) for the
Nov 2026 Reel. Page 1 is the fill-in template, page 2 is the filled-in sample
shown in the video. The sample is made up: Alex, Ms. Chen, the program and the
date are illustrative. Change it here, then re-run:

    python scripts/build-teacher-recommendation-email.py
"""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "resources" / "skillbridge-teacher-recommendation-email.docx"
FONT = "Calibri"
SIZE = 11.5
NAVY = RGBColor(0x1B, 0x2A, 0x4A)
GREY = RGBColor(0x5B, 0x65, 0x72)
BLUE = RGBColor(0x1F, 0x5F, 0xBF)

TEMPLATE = [
    [("Hi [Mr./Ms. Last name],", False)],
    [("Thank you so much for saying yes when I asked [after class today]! I figured it would help to put everything in one email, so it's easy to find later.", False)],
    [("I'm applying to [program name], which is [one sentence on what it is].", False)],
    [("I asked you because [why this teacher]. I still think about [one moment from their class they'd remember too, like an assignment you redid, a project, or a time you came in for help]. [What happened in the end.] So if you remember that the way I do, that's what I'd love the letter to talk about.", False)],
    [("The letter is due [date], which gives you about [number] weeks. [How they'll submit it, for example: Once I submit my application, the program will email you a link to upload it.]", False)],
    [("I've also attached my résumé, in case it helps to see what I do outside of class. I'll send one quick reminder a week before the deadline, just so it doesn't sneak up on you.", False)],
    [("Thanks again. It means a lot to me.", False)],
    [("[Your name]", False), ("\n[Grade], [period] [class]", False)],
]

SAMPLE = [
    "Hi Ms. Chen,",
    "Thank you so much for saying yes when I asked after class today! I figured it would help to put everything in one email, so it's easy to find later.",
    "I'm applying to the Summer Engineering Academy, which is a four-week program where students design and build a project with a small team.",
    "I asked you because your class is a big reason I'm applying. I still think about the bridge project, when mine collapsed on the first test and I ended up staying after school three days in a row to rebuild it. By the end, the second one held 40 pounds. So if you remember that week the way I do, that's what I'd love the letter to talk about.",
    "The letter is due March 1, which gives you about five weeks. Once I submit my application, the program will email you a link to upload it.",
    "I've also attached my résumé, in case it helps to see what I do outside of class. I'll send one quick reminder a week before the deadline, just so it doesn't sneak up on you.",
    "Thanks again. It means a lot to me.",
    "Alex Rivera\nJunior, 3rd period Physics",
]

BEFORE = [
    ("Ask in person first if you can. ", "Then send this email the same day, so they have every detail in one place."),
    ("Give them time. ", "A few weeks is the minimum, and more is better. Some schools set their own rules, so ask how far ahead your teacher wants requests."),
    ("Pick a teacher who knows you. ", "A class where they watched you work beats a famous teacher who barely knows your name."),
]

AFTER = [
    ("No résumé? ", "Attach a short list of what you do outside class instead: a job, a sport, a club, or helping at home."),
    ("Send one reminder, not five. ", "A week before the deadline is enough."),
    ("Say thank you again ", "once the letter is in, and tell them how it turned out."),
]


def run(p, text, bold=False, italic=False, size=SIZE, color=None):
    r = p.add_run(text)
    r.font.name = FONT
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    if color is not None:
        r.font.color.rgb = color
    return r


def para(doc, before=0, after=6, line=1.15):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), line
    return p


def rule(p):
    bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "6"), ("space", "4"), ("color", "C9D1DC")):
        bottom.set(qn(f"w:{k}"), v)
    bdr.append(bottom)
    p._p.get_or_add_pPr().append(bdr)


def shade(p, fill="F3F6FA"):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    p._p.get_or_add_pPr().append(shd)


def heading(doc, text, before=10):
    p = para(doc, before=before, after=4)
    p.paragraph_format.keep_with_next = True
    run(p, text, bold=True, size=13, color=NAVY)


def tips(doc, items):
    for lead, rest in items:
        p = doc.add_paragraph(style="List Bullet")
        pf = p.paragraph_format
        pf.space_before, pf.space_after, pf.line_spacing = Pt(0), Pt(3), 1.1
        run(p, lead, bold=True)
        run(p, rest)


def email_block(doc, subject, paragraphs, fill_template=False):
    p = para(doc, before=4, after=0)
    shade(p)
    run(p, "Subject: ", bold=True, color=GREY)
    fill(p, subject, bold=True)
    rule(p)
    for item in paragraphs:
        p = para(doc, after=7)
        shade(p)
        pieces = item if fill_template else [(item, False)]
        for text, bold in pieces:
            fill(p, text, bold=bold)


def fill(p, text, bold=False):
    """Brackets are the parts the student fills in; color them so they stand out."""
    for chunk in text.replace("]", "]\x00").split("\x00"):
        if "[" in chunk:
            pre, br = chunk.split("[", 1)
            if pre:
                run(p, pre, bold=bold)
            run(p, "[" + br, bold=bold, color=BLUE)
        elif chunk:
            run(p, chunk, bold=bold)


def build():
    doc = Document()
    s = doc.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(0.85)
    s.top_margin = s.bottom_margin = Inches(0.7)
    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = FONT, Pt(SIZE)
    normal.element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)

    p = para(doc, after=2)
    run(p, "The 10/10 Email to Ask a Teacher for a Recommendation", bold=True, size=19, color=NAVY)
    p = para(doc, after=8)
    run(p, "Copy it into a new email, fill in the blue parts, and make the story yours.", italic=True, color=GREY)

    heading(doc, "Before you send it", before=2)
    tips(doc, BEFORE)

    heading(doc, "The template")
    email_block(doc, "Recommendation letter for [program name] (due [date])", TEMPLATE, fill_template=True)

    heading(doc, "After you send it")
    tips(doc, AFTER)

    p = para(doc)
    p.add_run().add_break(WD_BREAK.PAGE)
    p = para(doc, after=2)
    run(p, "Filled-in example", bold=True, size=16, color=NAVY)
    p = para(doc, after=8)
    run(p, "This is the sample from our video. Alex, Ms. Chen, the program and the date are made up. "
           "The most important part is the story: pick one moment your teacher saw too, and say what happened in the end.",
        italic=True, color=GREY)
    email_block(doc, "Recommendation letter for Summer Engineering Academy (due March 1)", SAMPLE)

    p = para(doc, before=14, after=0)
    run(p, "Free from SkillBridge · joinskillbridge.com/resources", italic=True, size=9.5, color=GREY)

    core = doc.core_properties
    core.title = "SkillBridge 10/10 Teacher Recommendation Email"
    core.subject = "Email template for asking a teacher for a recommendation letter, with a filled-in example"
    core.author = "SkillBridge"
    core.keywords = "recommendation letter, teacher recommendation, email template, high school, SkillBridge"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
