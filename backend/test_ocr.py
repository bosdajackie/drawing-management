import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk, ImageDraw
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from app.ocr import OCRProcessor
import os

class OCRViewer(tk.Tk):
    def __init__(self):
        super().__init__()

        # Initialize OCR processor
        self.processor = OCRProcessor(tesseract_cmd=r"C:\Program Files\Tesseract-OCR\tesseract.exe")
        
        # Window setup
        self.title("OCR Dimension Viewer")
        self.geometry("1200x800")
        
        # Variables
        self.current_page = 0
        self.pages = []
        self.processed_results = {}
        
        # Create GUI elements
        self.create_widgets()
        
    def create_widgets(self):
        # Create main container
        self.main_container = ttk.Frame(self)
        self.main_container.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Create buttons frame
        self.button_frame = ttk.Frame(self.main_container)
        self.button_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Load PDF button
        self.load_btn = ttk.Button(self.button_frame, text="Load PDF", command=self.load_pdf)
        self.load_btn.pack(side=tk.LEFT, padx=5)
        
        # Navigation buttons
        self.prev_btn = ttk.Button(self.button_frame, text="Previous", command=self.prev_page)
        self.prev_btn.pack(side=tk.LEFT, padx=5)
        
        self.next_btn = ttk.Button(self.button_frame, text="Next", command=self.next_page)
        self.next_btn.pack(side=tk.LEFT, padx=5)
        
        # Page indicator
        self.page_label = ttk.Label(self.button_frame, text="Page: 0/0")
        self.page_label.pack(side=tk.LEFT, padx=5)
        
        # Create canvas for PDF display
        self.figure, self.ax = plt.subplots(figsize=(10, 14))
        self.canvas = FigureCanvasTkAgg(self.figure, master=self.main_container)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Results text area
        self.results_text = tk.Text(self.main_container, height=10)
        self.results_text.pack(fill=tk.X, pady=(10, 0))
        
    def load_pdf(self):
        try:
            # Process PDF
            pdf_path = "test_files/sample.pdf"
            if not os.path.exists(pdf_path):
                self.show_error("PDF file not found. Please place a PDF file at test_files/sample.pdf")
                return
                
            # Clear previous results
            self.pages.clear()
            self.processed_results.clear()
            self.current_page = 0
            
            # Convert PDF to images and process
            self.processed_results = self.processor.process_pdf(pdf_path)
            
            # Convert pages to PIL images
            from pdf2image import convert_from_path
            self.pages = convert_from_path(pdf_path)
            
            # Update page indicator
            self.page_label.config(text=f"Page: 1/{len(self.pages)}")
            
            # Show first page
            self.show_current_page()
            
        except Exception as e:
            self.show_error(f"Error loading PDF: {str(e)}")
            
    def show_current_page(self):
        if not self.pages:
            return
            
        # Clear previous plot
        self.ax.clear()
        
        # Display current page
        current_image = self.pages[self.current_page]
        self.ax.imshow(current_image)
        
        # Draw bounding boxes
        page_results = self.processed_results.get(self.current_page + 1, [])
        self.results_text.delete(1.0, tk.END)
        self.results_text.insert(tk.END, f"Dimensions found on page {self.current_page + 1}:\n")
        
        for result in page_results:
            coords = result['coordinates']
            value = result['value']
            confidence = result.get('confidence', 0)
            
            # Draw rectangle
            rect = plt.Rectangle(
                (coords['x'], coords['y']),
                coords['width'],
                coords['height'],
                fill=False,
                edgecolor='red',
                linewidth=2
            )
            self.ax.add_patch(rect)
            
            # Add text annotation
            self.ax.text(
                coords['x'],
                coords['y'] - 5,
                f"{value} ({confidence:.1f}%)",
                color='red',
                fontsize=8
            )
            
            # Add to results text
            self.results_text.insert(
                tk.END,
                f"Value: {value}, Confidence: {confidence:.1f}%, "
                f"Position: (x={coords['x']}, y={coords['y']}, "
                f"w={coords['width']}, h={coords['height']})\n"
            )
        
        # Remove axes
        self.ax.axis('off')
        
        # Update canvas
        self.canvas.draw()
        
    def prev_page(self):
        if self.current_page > 0:
            self.current_page -= 1
            self.page_label.config(text=f"Page: {self.current_page + 1}/{len(self.pages)}")
            self.show_current_page()
            
    def next_page(self):
        if self.current_page < len(self.pages) - 1:
            self.current_page += 1
            self.page_label.config(text=f"Page: {self.current_page + 1}/{len(self.pages)}")
            self.show_current_page()
            
    def show_error(self, message):
        self.results_text.delete(1.0, tk.END)
        self.results_text.insert(tk.END, f"ERROR: {message}")

def main():
    app = OCRViewer()
    app.mainloop()

if __name__ == "__main__":
    main() 