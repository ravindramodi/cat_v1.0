from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify
import pandas as pd
import os
import requests
import io
from io import BytesIO
import json


app = Flask(__name__)

# Upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

data = []
row_count = 0
column_order = []  # Initialize globally

# Load the brand data from JSON
BRANDS_FILE_PATH = os.path.join(app.root_path, 'brands_id.json')

def load_brands():
    with open(BRANDS_FILE_PATH, 'r') as f:
        brands = json.load(f)
    # Convert list of brands to a dictionary for easier lookup
    return {brand['id']: brand['name'] for brand in brands}

brands_data = load_brands()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        return redirect(request.url)
    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)
        global data, row_count, column_order
        df = pd.read_excel(filepath)

        # Clean up column names and replace NaN with None
        df.columns = df.columns.str.strip()  # Remove leading/trailing spaces from column names
        df = df.applymap(lambda x: x if pd.notnull(x) else None)  # Replace NaN with None

        # Capture the column order
        column_order = df.columns.tolist()

        # Convert the data to a dictionary format
        data = df.to_dict(orient='records')
        row_count = len(data)

        return redirect(url_for('editor'))

    
@app.route('/editor')
def editor():
    # Assuming `data` and `row_count` are being passed correctly
    column_order = list(data[0].keys()) if data else []  # Extract column order dynamically from the first row
    return render_template('editor.html', data=data, row_count=row_count, column_order=column_order)


@app.route('/proxy-image')
def proxy_image():
    image_url = request.args.get('url')
    try:
        # Fetch the image using requests
        response = requests.get(image_url)
        # Ensure the request was successful
        if response.status_code == 200:
            # Determine the correct MIME type
            content_type = response.headers.get('Content-Type')
            # Serve the image or content from Flask
            return send_file(BytesIO(response.content), mimetype=content_type)
        else:
            return "Image not found", 404
    except Exception as e:
        print(f"Error fetching image: {e}")
        return "Error fetching image", 500
    
def clean_text(input_string):
    if isinstance(input_string, str):
        return ''.join([c for c in input_string if ord(c) < 128]).strip()
    return input_string
   
print(json.dumps(column_order))
@app.route('/export', methods=['POST'])
def export_data():
    try:
        data = request.json.get('data')
        file_format = request.json.get('type', 'csv')  # Get the format type ('csv' or 'excel')

        df = pd.DataFrame(data)
        df = df.applymap(lambda x: clean_text(x) if pd.notnull(x) else "")

        if df.empty:
            return jsonify({"error": "The data is empty, cannot export."}), 400

        if file_format == 'excel':
            try:
                # Use BytesIO to handle the in-memory Excel file
                output = BytesIO()
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    df.to_excel(writer, index=False, sheet_name='Sheet1')
                output.seek(0)
                return send_file(
                    output,
                    as_attachment=True,
                    download_name='exported_file.xlsx',
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            except Exception as e:
                print(f"Excel Export Error: {e}")
                return jsonify({"error": "Failed to export as Excel. The file might be corrupt or invalid."}), 500

        elif file_format == 'csv':
            try:
                # Use BytesIO to handle the in-memory CSV file
                output = BytesIO()
                df.to_csv(output, index=False, encoding='utf-8-sig')
                output.seek(0)
                return send_file(
                    output,
                    as_attachment=True,
                    download_name='exported_file.csv',
                    mimetype='text/csv'
                )
            except Exception as e:
                print(f"CSV Export Error: {e}")
                return jsonify({"error": "Failed to export as CSV. The file might be corrupt or invalid."}), 500

        else:
            return jsonify({"error": "Invalid format specified. Choose either 'excel' or 'csv'."}), 400

    except Exception as e:
        print(f"Export Error: {e}")
        return jsonify({"error": "An unexpected error occurred during export. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5005)
