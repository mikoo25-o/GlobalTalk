import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

/* =========================
   RECIPIENTS / CONTACTS
========================= */

export const uploadContacts = (formData) =>
  api.post('/recipients/upload-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

export const uploadFile = uploadContacts

export const pasteNumbers = (data) =>
  api.post('/recipients/paste', data)

export const getLists = () =>
  api.get('/recipients/lists')

export const getList = (id) =>
  api.get(`/recipients/lists/${id}`)

export const deleteList = (id) =>
  api.delete(`/recipients/lists/${id}`)

/* =========================
   ACCOUNTS
========================= */

export const getAccounts = () =>
  api.get('/accounts/')

export const createAccount = (data) =>
  api.post('/accounts/', data)

export const updateAccount = (id, data) =>
  api.patch(`/accounts/${id}`, data)

export const deleteAccount = (id) =>
  api.delete(`/accounts/${id}`)

export const testAccount = (id) =>
  api.post(`/accounts/${id}/test`)

/* =========================
   CAMPAIGNS
========================= */

export const getCampaigns = () =>
  api.get('/campaigns/')

export const getCampaign = (id) =>
  api.get(`/campaigns/${id}`)

export const createCampaign = (data) =>
  api.post('/campaigns/', data)

export const updateCampaign = (id, data) =>
  api.patch(`/campaigns/${id}`, data)

export const duplicateCampaign = (id) =>
  api.post(`/campaigns/${id}/duplicate`)

export const launchCampaign = (id) =>
  api.post(`/campaigns/${id}/launch`)

export const pauseCampaign = (id) =>
  api.patch(`/campaigns/${id}/pause`)

export const cancelCampaign = (id) =>
  api.patch(`/campaigns/${id}/cancel`)

export const retryFailedCampaign = (id) =>
  api.post(`/campaigns/${id}/retry-failed`)

export const deleteCampaign = (id) =>
  api.delete(`/campaigns/${id}`)

export const getProgress = (id) =>
  api.get(`/campaigns/${id}/progress`)

export const exportCampaignLogs = (id) =>
  api.get(`/campaigns/${id}/export`, {
    responseType: 'blob'
  })

/* =========================
   ANALYTICS
========================= */

export const getOverview = () =>
  api.get('/analytics/overview')

export const getDeliveryLogs = (campaignId) =>
  api.get(
    `/analytics/delivery-logs${
      campaignId
        ? `?campaign_id=${campaignId}`
        : ''
    }`
  )

/* =========================
   TEMPLATES
========================= */

export const getTemplates = () =>
  api.get('/templates/')

export const createTemplate = (data) =>
  api.post('/templates/', data)

/* =========================
   EXPORT
========================= */

export default api