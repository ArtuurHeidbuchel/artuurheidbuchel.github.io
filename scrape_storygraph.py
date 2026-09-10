import json
from curl_cffi import requests
from bs4 import BeautifulSoup

def get_current_read():
    url = "https://app.thestorygraph.com/currently-reading/artuur_heidbuchel"
    response = requests.get(url, impersonate="chrome")
    
    if response.status_code != 200:
        print(f"Failed to fetch: {response.status_code}")
        return None
        
    soup = BeautifulSoup(response.text, 'html.parser')
    book_link = soup.find('a', href=lambda h: h and '/books/' in h)
    
    if book_link:
        img = book_link.find('img')
        if img and img.get('alt'):
            return {
                "title": img.get('alt'),
                "image": img.get('src')
            }
    return None

def main():
    book = get_current_read()
    if book:
        with open('storygraph.json', 'w') as f:
            json.dump(book, f)
        print(f"Successfully saved: {book['title']}")
    else:
        print("Could not find a book.")

if __name__ == "__main__":
    main()