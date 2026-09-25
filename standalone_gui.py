"""
NEURAPRESS Standalone Python Desktop GUI
Runs natively on Windows without Node.js or Electron.
"""
import sys
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading

def compress_pdf_native(input_path, output_path, quality_level=60):
    try:
        from pypdf import PdfReader, PdfWriter
        reader = PdfReader(input_path)
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)

        with open(output_path, "wb") as f:
            writer.write(f)
        return True, None
    except Exception as e:
        return False, str(e)

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("NEURAPRESS Quantum - Native Desktop Edition")
        self.geometry("640x420")
        self.configure(bg="#030712")
        self.input_file = None

        style = ttk.Style(self)
        style.theme_use('clam')
        style.configure(".", background="#030712", foreground="#00f3ff", font=('Segoe UI', 10))
        style.configure("TButton", background="#0a192f", foreground="#00f3ff", bordercolor="#00f3ff", font=('Segoe UI', 10, 'bold'))
        style.map("TButton", background=[('active', '#00f3ff')], foreground=[('active', '#030712')])

        header = tk.Label(self, text="NEURAPRESS QUANTUM", font=("Segoe UI", 18, "bold"), fg="#00f3ff", bg="#030712")
        header.pack(pady=15)

        sub = tk.Label(self, text="Local Windows PDF Compressor Core", font=("Segoe UI", 9), fg="#94a3b8", bg="#030712")
        sub.pack()

        self.file_label = tk.Label(self, text="No PDF selected", font=("Segoe UI", 10), fg="#e2e8f0", bg="#0f172a", width=55, height=3, relief="groove")
        self.file_label.pack(pady=20)

        btn_browse = ttk.Button(self, text="Select PDF File", command=self.browse_file)
        btn_browse.pack(pady=5)

        self.progress = ttk.Progressbar(self, orient="horizontal", length=440, mode="indeterminate")
        
        self.compress_btn = ttk.Button(self, text="Compress PDF", command=self.start_compress)
        self.compress_btn.pack(pady=15)

    def browse_file(self):
        path = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
        if path:
            self.input_file = path
            size_mb = os.path.getsize(path) / (1024 * 1024)
            self.file_label.config(text=f"{os.path.basename(path)} ({size_mb:.2f} MB)")

    def start_compress(self):
        if not self.input_file:
            messagebox.showwarning("Warning", "Please select a PDF document first.")
            return
        out_path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF files", "*.pdf")])
        if not out_path:
            return

        self.progress.pack(pady=10)
        self.progress.start(10)
        self.compress_btn.config(state="disabled")

        def worker():
            ok, err = compress_pdf_native(self.input_file, out_path)
            self.progress.stop()
            self.progress.pack_forget()
            self.compress_btn.config(state="normal")
            if ok:
                orig_s = os.path.getsize(self.input_file)
                new_s = os.path.getsize(out_path)
                saved = max(0, orig_s - new_s)
                pct = (saved / orig_s) * 100 if orig_s > 0 else 0
                messagebox.showinfo("Success", f"Compression Complete!\nSaved: {pct:.1f}%")
            else:
                messagebox.showerror("Error", f"Compression failed: {err}")

        threading.Thread(target=worker, daemon=True).start()

if __name__ == "__main__":
    app = App()
    app.mainloop()
