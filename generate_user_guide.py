#!/usr/bin/env python3
"""
PDF User Guide Generator for EECOHM Canteen Management System
Converts USER_MANUAL.md to a professionally formatted PDF
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime
import os
import re

# Color scheme matching the app
PRIMARY_COLOR = HexColor('#4f46e5')  # Indigo
SECONDARY_COLOR = HexColor('#64748b')  # Slate
ACCENT_COLOR = HexColor('#f59e0b')  # Amber

def create_custom_styles():
    """Create custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=PRIMARY_COLOR,
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    # Heading 2
    styles.add(ParagraphStyle(
        name='CustomHeading2',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    ))
    
    # Heading 3
    styles.add(ParagraphStyle(
        name='CustomHeading3',
        parent=styles['Heading3'],
        fontSize=13,
        textColor=SECONDARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        fontName='Helvetica-Bold'
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    ))
    
    # Code/monospace
    styles.add(ParagraphStyle(
        name='CustomCode',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#1e293b'),
        backColor=HexColor('#f1f5f9'),
        leftIndent=20,
        rightIndent=20,
        spaceBefore=6,
        spaceAfter=6,
        fontName='Courier'
    ))
    
    # List item
    styles.add(ParagraphStyle(
        name='ListItem',
        parent=styles['BodyText'],
        fontSize=10,
        leftIndent=30,
        bulletIndent=15,
        spaceAfter=4
    ))
    
    return styles

def parse_markdown_to_flowables(md_file_path, styles):
    """Parse markdown file and convert to ReportLab flowables"""
    flowables = []
    
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
        
        # H1 - Main Title
        if line.startswith('# '):
            text = line[2:].strip()
            flowables.append(Paragraph(text, styles['CustomTitle']))
            flowables.append(Spacer(1, 0.2*inch))
        
        # H2 - Major sections
        elif line.startswith('## '):
            text = line[3:].strip()
            # Remove markdown links from headings
            text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
            flowables.append(Spacer(1, 0.15*inch))
            flowables.append(Paragraph(text, styles['CustomHeading2']))
        
        # H3 - Subsections
        elif line.startswith('### '):
            text = line[4:].strip()
            flowables.append(Paragraph(text, styles['CustomHeading3']))
        
        # Horizontal rule
        elif line.startswith('---'):
            flowables.append(Spacer(1, 0.1*inch))
        
        # Unordered list
        elif line.startswith('- ') or line.startswith('* '):
            text = line[2:].strip()
            # Handle bold text
            text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', text)
            # Handle inline code
            text = re.sub(r'`([^`]+)`', r'<font face="Courier">\1</font>', text)
            flowables.append(Paragraph(f'• {text}', styles['ListItem']))
        
        # Numbered list
        elif re.match(r'^\d+\.\s', line):
            text = re.sub(r'^\d+\.\s', '', line).strip()
            # Handle bold text
            text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', text)
            # Handle inline code
            text = re.sub(r'`([^`]+)`', r'<font face="Courier">\1</font>', text)
            number = line.split('.')[0]
            flowables.append(Paragraph(f'{number}. {text}', styles['ListItem']))
        
        # Regular paragraph
        else:
            # Handle bold text
            line = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', line)
            # Handle italic
            line = re.sub(r'\*([^\*]+)\*', r'<i>\1</i>', line)
            # Handle inline code
            line = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#1e293b">\1</font>', line)
            # Handle links - just show the text
            line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<i>\1</i>', line)
            
            if line:
                flowables.append(Paragraph(line, styles['CustomBody']))
        
        i += 1
    
    return flowables

def add_header_footer(canvas, doc):
    """Add header and footer to each page"""
    canvas.saveState()
    
    # Header
    canvas.setFillColor(PRIMARY_COLOR)
    canvas.setFont('Helvetica-Bold', 10)
    canvas.drawString(inch, letter[1] - 0.5*inch, "EECOHM Canteen Management System")
    
    # Footer
    canvas.setFillColor(SECONDARY_COLOR)
    canvas.setFont('Helvetica', 8)
    page_num = canvas.getPageNumber()
    text = f"Page {page_num} | © 2025 EECOHM School of Excellence"
    canvas.drawCentredString(letter[0]/2, 0.5*inch, text)
    
    # Footer line
    canvas.setStrokeColor(HexColor('#e2e8f0'))
    canvas.setLineWidth(0.5)
    canvas.line(inch, 0.7*inch, letter[0] - inch, 0.7*inch)
    
    canvas.restoreState()

def generate_pdf(md_file_path, output_pdf_path):
    """Generate PDF from markdown file"""
    print(f"Generating PDF from {md_file_path}...")
    
    # Create PDF document
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch
    )
    
    # Get styles
    styles = create_custom_styles()
    
    # Build content
    story = []
    
    # Cover page
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("EECOHM V2", styles['CustomTitle']))
    story.append(Paragraph("Canteen Management System", styles['CustomTitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("User Guide", styles['CustomHeading2']))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y')}",
        styles['CustomBody']
    ))
    story.append(PageBreak())
    
    # Parse markdown content
    content_flowables = parse_markdown_to_flowables(md_file_path, styles)
    story.extend(content_flowables)
    
    # Build PDF
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    
    print(f"✓ PDF generated successfully: {output_pdf_path}")
    file_size = os.path.getsize(output_pdf_path) / 1024  # KB
    print(f"  File size: {file_size:.1f} KB")

if __name__ == "__main__":
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    md_file = os.path.join(script_dir, "USER_MANUAL.md")
    pdf_file = os.path.join(script_dir, "EECOHM_Canteen_User_Guide.pdf")
    
    # Check if markdown file exists
    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found!")
        exit(1)
    
    # Generate PDF
    generate_pdf(md_file, pdf_file)
    print(f"\n✓ User guide PDF is ready!")
    print(f"  Location: {pdf_file}")
