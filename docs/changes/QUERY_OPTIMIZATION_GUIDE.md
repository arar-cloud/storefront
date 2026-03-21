# GraphQL Query Optimization Guide

## Preventing N+1 Queries

### Problem: N+1 Queries

N+1 queries occur when you fetch a parent resource and then make separate queries for each child resource:

```typescript
// BAD: N+1 Query Pattern
const user = await fetchUser(userId);
const orders = await Promise.all(
  user.orderIds.map(id => fetchOrder(id)) // N additional queries!
);
```

### Solution: Batched Queries

```typescript
// GOOD: Single batched query
const data = await fetchUserWithOrders(userId);
```

## GraphQL Fragment Reuse

### Problem: Duplicate Fragments

Fragments should be defined once and reused:

```graphql
# BAD: Defining similar fields multiple times
query GetUserProfile {
  user {
    id
    name
    email
    address {
      street
      city
    }
  }
  relatedUser {
    id
    name
    email
    address {
      street
      city
    }
  }
}
```

### Solution: Fragment Pattern

```graphql
# GOOD: Define fragment once
fragment UserFields on User {
  id
  name
  email
  address {
    street
    city
  }
}

query GetUserProfile {
  user { ...UserFields }
  relatedUser { ...UserFields }
}
```

## Query Deduplication

Use the provided `fetchWithDeduplication` utility to prevent duplicate queries:

```typescript
import { fetchWithDeduplication } from '@/lib/graphql-deduplication';

const result = await fetchWithDeduplication(
  () => graphqlFetch(query, variables),
  query,
  variables,
);
```

## Caching Strategy

1. **Client-side Caching**: Cache query results in React Query or similar
2. **Request Batching**: Use Apollo Client's batching or custom implementation
3. **Fragment Reuse**: Share field definitions across queries
4. **Selective Fetching**: Only request fields you actually need

## Performance Monitoring

Monitor query performance using the provided utilities:

```typescript
import { reportMetric, detectN1Patterns } from '@/lib/monitoring/performance-config';

const start = performance.now();
const result = await graphqlFetch(query, variables);
const duration = performance.now() - start;

reportMetric('graphql_query', duration, { query: query.substring(0, 50) });

// Detect suspicious patterns
const patterns = detectN1Patterns();
if (patterns.length > 0) {
  console.warn('Potential N+1 queries detected:', patterns);
}
```

## Best Practices

1. ✅ Always use fragments for repeated field sets
2. ✅ Batch related queries together
3. ✅ Request only the fields you need
4. ✅ Implement request deduplication
5. ✅ Monitor slow queries (>1000ms)
6. ❌ Don't make queries in loops
7. ❌ Don't duplicate field selections
8. ❌ Don't fetch unused data
