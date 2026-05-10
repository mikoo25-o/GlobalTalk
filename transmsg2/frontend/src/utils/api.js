import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Recipients
export const uploadFile   = (formData)        => api.post('/recipients/upload-file', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const pasteNumbers = (data)             => api.post('/recipients/paste', data)
export const getLists     = ()                 => api.get('/recipients/lists')
export const getList      = (id)               => api.get(`/recipients/lists/${id}`)
export const deleteList   = (id)               => api.delete(`/recipients/lists/${id}`)

// Accounts
export const getAccounts    = ()               => api.get('/accounts/')
export const createAccount  = (data)           => api.post('/accounts/', data)
export const updateAccount  = (id, data)       => api.patch(`/accounts/${id}`, data)
export const deleteAccount  = (id)             => api.delete(`/accounts/${id}`)
export const testAccount    = (id)             => api.post(`/accounts/${id}/test`)

// Campaigns
export const getCampaigns   = ()               => api.get('/campaigns/')
export const getCampaign    = (id)             => api.get(`/campaigns/${id}`)
export const createCampaign = (data)           => api.post('/campaigns/', data)
export const launchCampaign = (id)             => api.post(`/campaigns/${id}/launch`)
export const pauseCampaign  = (id)             => api.patch(`/campaigns/${id}/pause`)
export const deleteCampaign = (id)             => api.delete(`/campaigns/${id}`)
export const getProgress    = (id)             => api.get(`/campaigns/${id}/progress`)

// Analytics
export const getOverview     = ()              => api.get('/analytics/overview')
export const getDeliveryLogs = (campaign_id)   => api.get(`/analytics/delivery-logs${campaign_id ? `?campaign_id=${campaign_id}` : ''}`)

// Templates
export const getTemplates   = ()               => api.get('/templates/')
export const createTemplate = (data)           => api.post('/templates/', data)

export default api
