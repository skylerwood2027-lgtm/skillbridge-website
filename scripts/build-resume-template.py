# /// script
# requires-python = ">=3.11"
# dependencies = ["python-docx==1.2.0"]
# ///

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "resources" / "skillbridge-high-school-resume-starter.docx"
NAVY = "1B3A6B"
GRAY = RGBColor(95, 105, 115)
BLACK = RGBColor(13, 27, 42)


def set_cell_margins(cell, top=40, start=55, bottom=40, end=55):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def remove_table_borders(table):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "nil")


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_repeat_table_layout_fixed(table):
    tbl_pr = table._tbl.tblPr
    layout = tbl_pr.first_child_found_in("w:tblLayout")
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")


def set_cell_width(cell, inches):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(int(inches * 1440)))
    tc_w.set(qn("w:type"), "dxa")


def set_run(run, size=9.5, bold=False, color=BLACK, italic=False):
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color


def add_section_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.upper())
    set_run(r, size=9.5, bold=True, color=RGBColor.from_string(NAVY))
    p_pr = p._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), NAVY)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def add_entry(doc, title, organization, location, dates, bullets):
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    remove_table_borders(table)
    set_repeat_table_layout_fixed(table)
    left, right = table.rows[0].cells
    set_cell_width(left, 5.7)
    set_cell_width(right, 1.3)
    for cell in (left, right):
        set_cell_margins(cell, top=0, start=0, bottom=0, end=0)

    p = left.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(title)
    set_run(r, size=9.5, bold=True)
    r = p.add_run(f" | {organization}")
    set_run(r, size=9.5)

    p = right.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(dates)
    set_run(r, size=9.2, color=GRAY)

    if location:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(location)
        set_run(r, size=9.2, italic=True, color=GRAY)

    for bullet in bullets:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.left_indent = Inches(0.18)
        p.paragraph_format.first_line_indent = Inches(-0.12)
        p.paragraph_format.space_after = Pt(0.5)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(bullet)
        set_run(r, size=9.2, color=GRAY)


def build():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.43)
    section.bottom_margin = Inches(0.42)
    section.left_margin = Inches(0.55)
    section.right_margin = Inches(0.55)
    section.header_distance = Inches(0.2)
    section.footer_distance = Inches(0.18)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.font.size = Pt(9.5)
    normal.paragraph_format.space_after = Pt(0)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(1)
    r = title.add_run("[YOUR FIRST AND LAST NAME]")
    set_run(r, size=18, bold=True, color=RGBColor.from_string(NAVY))

    contact = doc.add_paragraph()
    contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
    contact.paragraph_format.space_after = Pt(3)
    r = contact.add_run("[City, State]  |  [Professional email]  |  [Phone]  |  [Optional portfolio or LinkedIn]")
    set_run(r, size=9, color=GRAY)

    add_section_heading(doc, "Education")
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    remove_table_borders(table)
    set_repeat_table_layout_fixed(table)
    left, right = table.rows[0].cells
    set_cell_width(left, 5.7)
    set_cell_width(right, 1.3)
    for cell in (left, right):
        set_cell_margins(cell, top=0, start=0, bottom=0, end=0)
    p = left.paragraphs[0]
    r = p.add_run("[High school name]")
    set_run(r, size=9.5, bold=True)
    p = right.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("Expected [Month Year]")
    set_run(r, size=9.2, color=GRAY)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("[City, State]  |  GPA: [optional]  |  Relevant coursework: [optional and specific]")
    set_run(r, size=9.2, color=GRAY)

    add_section_heading(doc, "Experience and projects")
    add_entry(
        doc,
        "[Role, project, paid work, or family responsibility]",
        "[Organization, class, employer, or independent]",
        "[City, State or Remote — optional]",
        "[Month Year–Present]",
        [
            "[Start with an action verb. Say what you did, who or what it helped, and the result you can prove.]",
            "[Add a real number only if you know it: people served, items made, hours, dollars, views, time saved, or deadline met.]",
        ],
    )
    add_entry(
        doc,
        "[Second role, project, activity, or responsibility]",
        "[Organization, team, club, or independent]",
        "",
        "[Month Year–Month Year]",
        [
            "[Use one or two bullets. Focus on what you owned, built, organized, improved, taught, sold, repaired, or completed.]",
        ],
    )

    add_section_heading(doc, "Activities and service")
    add_entry(
        doc,
        "[Club, sport, volunteering, caregiving, or school activity]",
        "[School or organization]",
        "",
        "[Grade level or dates]",
        [
            "[Describe your responsibility or contribution. Do not write only “member” or list duties without context.]",
        ],
    )

    add_section_heading(doc, "Skills")
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run("Tools: ")
    set_run(r, size=9.2, bold=True)
    r = p.add_run("[Only tools you can actually use, such as Google Sheets, Canva, Python, CapCut, or a point-of-sale system]")
    set_run(r, size=9.2, color=GRAY)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run("Languages or certifications: ")
    set_run(r, size=9.2, bold=True)
    r = p.add_run("[Optional. Name your level honestly and include the issuer/date for a real certification]")
    set_run(r, size=9.2, color=GRAY)

    note_table = doc.add_table(rows=1, cols=1)
    note_table.autofit = False
    remove_table_borders(note_table)
    cell = note_table.cell(0, 0)
    shade_cell(cell, "EBF4FC")
    set_cell_margins(cell, top=60, start=80, bottom=60, end=80)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("BEFORE YOU SEND IT: ")
    set_run(r, size=8.2, bold=True, color=RGBColor.from_string(NAVY))
    r = p.add_run(
        "Replace every bracketed prompt. Keep it to one page. Remove your street address, age, photo, references, and anything you cannot explain. Proofread it, then export a PDF named First_Last_Resume.pdf."
    )
    set_run(r, size=8.2, color=RGBColor.from_string(NAVY))

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = footer.add_run("Free SkillBridge high-school resume starter • joinskillbridge.com")
    set_run(r, size=7.5, color=GRAY)

    core = doc.core_properties
    core.title = "SkillBridge High-School Resume Starter"
    core.subject = "Editable one-page resume template for high-school students with little or no formal work experience"
    core.author = "SkillBridge"
    core.keywords = "high school resume, student resume, first job, SkillBridge"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
