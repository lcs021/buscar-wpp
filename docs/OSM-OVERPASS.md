# OpenStreetMap / Overpass connector (draft)

This endpoint is an authenticated, reviewer-gated search adapter. It returns a small set of candidate business records and stores the source results with an idempotency key; it does not insert leads, qualify candidates, contact businesses, create demos, or run on a schedule.

## Enablement gate

The connector returns `503` before auth or quota work unless the Edge Function has all of:

- `OVERPASS_API_URL=https://<your-controlled-host>/api/interpreter`
- `OVERPASS_API_SELF_HOSTED=true`
- the usual Supabase URL, anon key, and service-role key

The `SELF_HOSTED` value is an operator attestation, not proof. Do not point the application at the shared public Overpass instances: the OSMF/FOSSGIS usage guidance says applications depending on public instances as a backend should host their own instance. Self-hosting has compute, data-update, monitoring, and bandwidth costs even though OSM data carries no API fee. The implementation blocks known public endpoints, requires HTTPS, and configures fetch to fail on redirects; any 3xx response is recorded as a source failure without following its Location.

## Limits and retry behavior

- Until organization membership exists, two shared global counters permit at most 50 source-call reservations and at most 50 result/candidate slots per UTC day across all reviewer accounts. These are global ceilings, deliberately more conservative than separate organization caps; they are not organization quotas.
- Before contacting Overpass, a locked reservation consumes one call and reserves up to 10 candidate slots, limited by the global daily remainder. The QL `out` limit and result mapper use that server-computed reservation, and the SQL finalizer rejects payloads larger than it. Thus even a source response of 10 at the 49-candidate boundary can store only the one reserved candidate; total stored/reserved candidates never exceeds 50.
- A successful non-empty response releases unused candidate slots. Empty results, source failures, interrupted calls, and ambiguous persistence retain both the call and full candidate reservation; they never refund quota. A new idempotency key always consumes a call, including an empty search.
- A request lease expires after two minutes. The next reservation call recovers up to 100 expired reservations, marking them `failed` with `reservation_expired_ambiguous`, `recovered_at`, and a fixed recovery reason. Quota remains charged and that idempotency key can never call the source again. This avoids repeating an upstream request whose result may have been fetched but not persisted.
- Reusing the same idempotency UUID with the same filters returns the saved state/results without another source query. Reusing it with different filters is rejected. The returned results are deduplicated by OSM element type/ID.
- Each request has a 20-second timeout kept active through response-body consumption and JSON parsing, a 4 MiB query-side `maxsize`, at most 10 result elements, a 2 MiB response-read cap, and a 4 KiB input JSON cap. There is one city/UF/segment query; no tiling, pagination, or repeated retries to the source.
- Supported segment keys are fixed in code. There is no client-supplied result limit or Overpass QL fragment.

## Provenance and website evidence

Each candidate stores only a business name, OSM category, requested city/UF, OSM element ID/link, source, observation time, `ODbL-1.0`, and attribution. Phone, email, postal address, and contact tags are omitted. A valid `website` tag is reported as found in OSM. A missing tag is labeled `not_located_in_sources_consulted`; an invalid website tag or empty/failed query is inconclusive. None of these labels proves that a business has no website.

Every response includes visible attribution `© OpenStreetMap contributors` and the OSM copyright/license link. ODbL attribution/share-alike implications can apply to a publicly used or shared derivative database; confirm the legal treatment before combining/exporting this data in the multi-tenant CRM. See the [OSM copyright and license notice](https://www.openstreetmap.org/copyright), [public instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), and [Overpass instance list](https://wiki.openstreetmap.org/wiki/OSM_Server_Side_Script).

## Current limitations

- This draft has no frontend control, no automatic import into `leads`, no scheduled worker, and no production endpoint configured. The new migration must be reviewed/applied separately before enabling a staged self-hosted endpoint.
- Current tenants are not modeled. Both limits are global: max 50 call reservations/day and max 50 result slots/day shared across users. Neither is a per-organization quota. A first-class organization/membership model is required before changing these shared ceilings to separate organization quotas.
- Exact municipality boundary lookup depends on OSM administrative relations carrying the expected name and `ISO3166-2=BR-<UF>` tag. A missing/ambiguous boundary or zero results is `inconclusive`; no fallback geocoder is called.
- OSM data coverage varies. This connector is for source review, not a determination that an entity is qualified or lacks a site.

