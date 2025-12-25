const API_URL = 'https://functions.poehali.dev/6582dc19-ed3f-45c2-b62e-1ea411f5e38a';

export const api = {
  async getUsers() {
    const res = await fetch(`${API_URL}/?action=get_users`);
    return res.json();
  },

  async createUser(data: { name: string; role: string; phone?: string; email?: string; created_by?: string }) {
    const res = await fetch(`${API_URL}/?action=create_user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getItems(status = 'stored') {
    const res = await fetch(`${API_URL}/?action=get_items&status=${status}`);
    return res.json();
  },

  async createItem(data: any) {
    const res = await fetch(`${API_URL}/?action=create_item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async returnItem(qrNumber: string) {
    const res = await fetch(`${API_URL}/?action=return_item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrNumber })
    });
    return res.json();
  },

  async sendSMS(data: { phone: string; message: string; itemId?: string; sentBy?: string }) {
    const res = await fetch(`${API_URL}/?action=send_sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
