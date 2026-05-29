import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (fn, options = {}) => {
    const { onSuccess, onError, successMsg, loadingMsg } = options
    setLoading(true)
    setError(null)
    let toastId
    if (loadingMsg) toastId = toast.loading(loadingMsg)
    try {
      const result = await fn()
      if (toastId) toast.dismiss(toastId)
      if (successMsg) toast.success(successMsg)
      if (onSuccess) onSuccess(result)
      return result
    } catch (err) {
      if (toastId) toast.dismiss(toastId)
      const msg = err.response?.data?.message || err.message || 'An error occurred'
      setError(msg)
      toast.error(msg)
      if (onError) onError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, execute }
}

export const useFetch = (fetchFn, deps = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result.data?.data ?? result.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetch }
}
