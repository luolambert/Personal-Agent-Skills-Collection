import { useState, useEffect, useCallback } from 'react';
import { getSkills, getTags } from '../services/api';

export function useSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    tags: [],
    starred: false
  });

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.tags.length > 0) params.tags = filters.tags.join(',');
      if (filters.starred) params.starred = true;
      
      const data = await getSkills(params);
      setSkills(data.skills || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  return {
    skills,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchSkills
  };
}

export function useTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, refetch: fetchTags };
}
