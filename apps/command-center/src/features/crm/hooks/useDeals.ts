import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Deal } from '../../../lib/supabase'

type DealFilters = {
  contactId?: string
  companyId?: string
  stage?: string
  status?: string
  minAmount?: number
  maxAmount?: number
  currency?: string
}

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId)
      }
      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId)
      }
      if (filters?.stage) {
        query = query.eq('stage', filters.stage)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount)
      }
      if (filters?.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount)
      }
      if (filters?.currency) {
        query = query.eq('currency', filters.currency)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Deal[]
    },
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Deal
    },
    enabled: !!id,
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('deals')
        .insert(deal)
        .select()
        .single()

      if (error) throw error
      return data as Deal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      const { data, error } = await supabase
        .from('deals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Deal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deals', data.id] })
    },
  })
}

export function useDeleteDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useDealStats(filters?: DealFilters) {
  return useQuery({
    queryKey: ['deals-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select('amount, currency, stage, status')

      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId)
      }
      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId)
      }
      if (filters?.stage) {
        query = query.eq('stage', filters.stage)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.currency) {
        query = query.eq('currency', filters.currency)
      }

      const { data, error } = await query

      if (error) throw error

      const deals = data as Deal[]
      const stats = {
        totalDeals: deals.length,
        totalValue: deals.reduce((sum, deal) => sum + (deal.amount || 0), 0),
        totalByCurrency: {} as Record<string, number>,
        totalByStage: {} as Record<string, number>,
        avgDealSize: 0,
      }

      deals.forEach((deal) => {
        if (deal.amount) {
          if (!stats.totalByCurrency[deal.currency]) {
            stats.totalByCurrency[deal.currency] = 0
          }
          stats.totalByCurrency[deal.currency] += deal.amount

          if (deal.stage) {
            if (!stats.totalByStage[deal.stage]) {
              stats.totalByStage[deal.stage] = 0
            }
            stats.totalByStage[deal.stage] += deal.amount
          }
        }
      })

      stats.avgDealSize = stats.totalDeals > 0 ? stats.totalValue / stats.totalDeals : 0

      return stats
    },
  })
}
