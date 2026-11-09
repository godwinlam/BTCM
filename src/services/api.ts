import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // If running in browser (web / mobile phone browser):
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const { hostname, protocol, origin } = window.location;
    const isHttps = protocol === 'https:';

    // 1. Check if running on local development (localhost, 127.0.0.1, or local LAN IP e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (isLocalHost) {
      return `http://${hostname}:5000/api`;
    }

    // 2. If running on a public remote host (e.g. Cloudflare Workers, *.workers.dev, or custom domain):
    // If an explicit remote EXPO_PUBLIC_API_URL is configured, use it (ensuring HTTPS to avoid Mixed Content)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('192.168.')) {
      if (isHttps && envUrl.startsWith('http://')) {
        return envUrl.replace('http://', 'https://');
      }
      return envUrl;
    }

    // 3. Fallback for deployed production (e.g. Cloudflare Workers reverse-proxying /api on same HTTPS origin)
    return `${origin}/api`;
  }

  // Fallback for native runtime / SSR
  return envUrl || 'http://localhost:5000/api';
};

class ApiService {
  private token: string | null = null;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.token = window.localStorage.getItem('btcm_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('btcm_token', token);
      } else {
        window.localStorage.removeItem('btcm_token');
      }
    }
  }

  logout() {
    this.setToken(null);
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const baseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || `Request failed with status ${response.status}` };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          // If token is invalid, expired, or from previous DB session, clear it immediately
          this.setToken(null);
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err: any) {
      console.warn(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // Auth
  async login(loginId: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, username: loginId, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async register(
    formData: {
      username: string;
      email: string;
      password: string;
      fullName?: string;
      referralCode?: string;
      placementUsername?: string;
      positionParent?: string;
      positionUsername?: string;
      placementLeg?: 'A' | 'B';
    },
    options?: { keepCurrentSession?: boolean }
  ) {
    const existingToken = this.token;
    const shouldKeepCurrentSession = options?.keepCurrentSession ?? Boolean(existingToken);

    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    if (data.token) {
      if (shouldKeepCurrentSession && existingToken) {
        // Keep active session of current login user, do NOT switch to new user login
        this.setToken(existingToken);
      } else {
        // Guest registration: set token for new user
        this.setToken(data.token);
      }
    }
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(formData: {
    fullName?: string;
    email?: string;
    phone?: string;
    btcPayoutAddress?: string;
    usdtPayoutAddress?: string;
    usdtTrc20PayoutAddress?: string;
    usdtErc20PayoutAddress?: string;
    usdcPayoutAddress?: string;
    defaultPlacementLeg?: string;
    address?: string;
    bio?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(formData),
    });
  }

  async updatePassword(formData: { currentPassword: string; newPassword: string }) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(formData),
    });
  }

  async submitKyc(formData: {
    documentType: string;
    documentNumber: string;
    frontImageUrl: string;
    backImageUrl?: string;
    selfieImageUrl?: string;
  }) {
    return this.request('/auth/kyc', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  async adminReviewKyc(userId: string | number, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) {
    return this.request(`/admin/users/${userId}/kyc`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  // Mining
  async getPackages() {
    return this.request('/mining/packages');
  }

  async getMineBestInfo() {
    return this.request('/mining/minebest-info');
  }

  async getBtcPrice(): Promise<{ price: number; change24h: number }> {
    try {
      const res: any = await this.request('/mining/btc-price');
      if (res && res.data && res.data.price) {
        return {
          price: Number(res.data.price),
          change24h: Number(res.data.change24h || 0),
        };
      }
    } catch (e) {
      // Fallback
    }

    // Direct web fallback if needed
    try {
      const resp = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const json = await resp.json();
      if (json && json.data && json.data.amount) {
        return {
          price: parseFloat(json.data.amount),
          change24h: 1.5,
        };
      }
    } catch (err) {
      // ignore
    }

    return { price: 78300, change24h: 1.5 };
  }

  async purchasePackage(tier: number) {
    return this.request('/mining/purchase', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  async getMyContracts() {
    return this.request('/mining/my-contracts');
  }

  async harvestDailyYield() {
    return this.request('/mining/harvest', {
      method: 'POST',
    });
  }

  // Network & Binary MLM
  async getNetworkSummary() {
    return this.request('/network/summary');
  }

  async getBinaryTree(userId?: string, depth: number = 4) {
    const query = userId ? `?userId=${userId}&depth=${depth}` : `?depth=${depth}`;
    return this.request(`/network/tree${query}`);
  }

  async getDirectReferrals() {
    return this.request('/network/referrals');
  }

  async getStarRanking() {
    return this.request('/network/star-ranking');
  }

  async settleDailyBinary(allUsers: boolean = false) {
    return this.request('/network/settle-daily-binary', {
      method: 'POST',
      body: JSON.stringify({ allUsers }),
    });
  }

  async placeMember(memberUsername: string, parentUsername: string, leg: 'A' | 'B') {
    return this.request('/network/place', {
      method: 'POST',
      body: JSON.stringify({ memberUsername, parentUsername, leg }),
    });
  }

  // Wallet
  async getTransactions(limit: number = 50) {
    return this.request(`/wallet/transactions?limit=${limit}`);
  }

  async getDepositInfo() {
    return this.request('/wallet/deposit-info');
  }

  async getMyDeposits() {
    return this.request('/wallet/my-deposits');
  }

  async depositFunds(
    amount: number,
    txHash?: string,
    network?: string,
    currency?: 'USDT' | 'BTC' | 'USDC'
  ) {
    return this.request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, txHash, network, currency: currency || 'USDT' }),
    });
  }

  async transferFunds(payload: {
    recipient: string;
    currency: 'USDT' | 'BTC';
    amount: number;
    note?: string;
  }) {
    return this.request('/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async withdrawFunds(payload: {
    currency: 'USDT' | 'BTC';
    amount: number;
    destinationAddress: string;
    network?: string;
  }) {
    return this.request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async lookupRecipient(query: string) {
    return this.request(`/wallet/recipient-lookup?query=${encodeURIComponent(query)}`);
  }

  // Admin User Management
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminUsers(params: {
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return this.request(`/admin/users${qs ? `?${qs}` : ''}`);
  }

  async getAdminUser(id: number | string) {
    return this.request(`/admin/users/${id}`);
  }

  async updateAdminUser(id: number | string, data: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: 'admin' | 'user';
    status?: 'ACTIVE' | 'SUSPENDED';
    starRank?: number;
    defaultPlacementLeg?: 'A' | 'B';
  }) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async adjustUserWallet(id: number | string, data: {
    currency: 'USDT' | 'BTC';
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    reason?: string;
  }) {
    return this.request(`/admin/users/${id}/adjust-wallet`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetUserPassword(id: number | string, newPassword: string) {
    return this.request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async createAdminUser(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    role?: 'admin' | 'user';
    sponsorUsername?: string;
    initialUsdt?: number;
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin Withdrawal Management
  async getAdminWithdrawalStats() {
    return this.request('/admin/withdrawals/stats');
  }

  async getAdminWithdrawals(params: {
    status?: string;
    currency?: string;
    search?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.currency) query.append('currency', params.currency);
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return this.request(`/admin/withdrawals${qs ? `?${qs}` : ''}`);
  }

  async getAdminWithdrawal(id: number | string) {
    return this.request(`/admin/withdrawals/${id}`);
  }

  async approveAdminWithdrawal(id: number | string, data: { adminNotes?: string } = {}) {
    return this.request(`/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeAdminWithdrawal(id: number | string, data: { txHash?: string; adminNotes?: string }) {
    return this.request(`/admin/withdrawals/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectAdminWithdrawal(id: number | string, data: { reason: string }) {
    return this.request(`/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async batchProcessWithdrawals(data: {
    action: 'APPROVE' | 'COMPLETE';
    ids: number[];
    txHashes?: string[];
    adminNotes?: string;
  }) {
    return this.request('/admin/withdrawals/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin Deposits & Configuration
  async getAdminDepositConfig() {
    return this.request('/admin/deposits/config');
  }

  async updateAdminDepositConfig(data: {
    currency?: 'USDT' | 'BTC' | 'USDC';
    address: string;
    network?: string;
    instructions?: string;
  }) {
    return this.request('/admin/deposits/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminDepositStats() {
    return this.request('/admin/deposits/stats');
  }

  async getAdminDeposits(params: {
    status?: string;
    currency?: string;
    search?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.currency) query.append('currency', params.currency);
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return this.request(`/admin/deposits${qs ? `?${qs}` : ''}`);
  }

  async getAdminDeposit(id: number | string) {
    return this.request(`/admin/deposits/${id}`);
  }

  async approveAdminDeposit(id: number | string, data: { adminNotes?: string } = {}) {
    return this.request(`/admin/deposits/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectAdminDeposit(id: number | string, data: { reason: string; adminNotes?: string }) {
    return this.request(`/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Instant Buy / Sell BTC Trading
  async getTradeQuote() {
    return this.request('/trade/quote');
  }

  async executeTrade(action: 'BUY' | 'SELL', amount: number) {
    return this.request('/trade/swap', {
      method: 'POST',
      body: JSON.stringify({ action, amount }),
    });
  }

  async getTradeHistory(page: number = 1, limit: number = 20) {
    return this.request(`/trade/history?page=${page}&limit=${limit}`);
  }
}

export const api = new ApiService();
