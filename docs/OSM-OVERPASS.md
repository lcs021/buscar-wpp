# OpenStreetMap / Overpass connector (draft)

This endpoint is an authenticated, reviewer-gated search adapter. It returns a small set of candidate business records and stores the source results with an idempotency key; it does not insert leads, qualify candidates, contact businesses, create demos, or run on a schedule.

## Enablement gate

The connector returns `503` before auth or quota work unless the Edge Function has all of:

- `OVERPASS_API_URL=https://<your-controlled-host>/api/interpreter`
- `OVERPASS_API_SELF_HOSTED=true`
- the usual Supabase URL, anon key, and service-role key

The `SELF_HOSTED` value is an operator attestation, not proof. Do not point the application at the shared public Overpass instances: the OSMF/FOSSGIS usage guidance says applications depending on public instances as a backend should host their own instance. Self-hosting has compute, data-update, monitoring, and bandwidth costs even though OSM data carries no API fee. The implementation blocks known public endpoints, requires HTTPS, and configures fetch to fail on redirects; any 3xx response is recorded as a source failure without following its Location.

## Limits and retry behavior

- Until organization membership exists, one shared global counter permits at most 50 source-call reservations per UTC day across all reviewer accounts. This is deliberately more restrictive than a per-organization cap and is not an organization quota.
- Each new idempotency key consumes one call reservation before any upstream request, including searches that succeed with zero results. The counter never decrements for empty results, source failures, interrupted calls, or ambiguous persistence. Each query asks for at most 10 elements; this separate response cap is not the daily quota.
- A request lease expires after two minutes. The next reservation call recovers up to 100 expired reservations, marking them `failed` with `reservation_expired_ambiguous`, `recovered_at`, and a fixed recovery reason. Quota remains charged and that idempotency key can never call the source again. This avoids repeating an upstream request whose result may have been fetched but not persisted.
- Reusing the same idempotency UUID with the same filters returns the saved state/results without another source query. Reusing it with different filters is rejected. The returned results are deduplicated by OSM element type/ID.
- Each request has a 20-second timeout kept active through response-body consumption and JSON parsing, a 4 MiB query-side `maxsize`, at most 10 result elements, a 2 MiB response-read cap, and a 4 KiB input JSON cap. There is one city/UF/segment query; no tiling, pagination, or repeated retries to the source.
- Supported segment keys are fixed in code. There is no client-supplied result limit or Overpass QL fragment.

## Provenance and website evidence

Each candidate stores only a business name, OSM category, requested city/UF, OSM element ID/link, source, observation time, `ODbL-1.0`, and attribution. Phone, email, postal address, and contact tags are omitted. A valid `website` tag is reported as found in OSM. A missing tag is labeled `not_located_in_sources_consulted`; an invalid website tag or empty/failed query is inconclusive. None of these labels proves that a business has no website.

Every response includes visible attribution `© OpenStreetMap contributors` and the OSM copyright/license link. ODbL attribution/share-alike implications can apply to a publicly used or shared derivative database; confirm the legal treatment before combining/exporting this data in the multi-tenant CRM. See the [OSM copyright and license notice](https://www.openstreetmap.org/copyright), [public instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), and [Overpass instance list](https://wiki.openstreetmap.org/wiki/OSM_Server_Side_Script).

## Current limitations

- This draft has no frontend control, no automatic import into `leads`, no scheduled worker, and no production endpoint configured. The new migration must be reviewed/applied separately before enabling a staged self-hosted endpoint.
- Current tenants are not modeled. The limit is a single global 50-call/day ceiling shared by all users; it is not a per-organization quota. A first-class organization/membership model is required before changing that shared cap to separate organization quotas.
- Exact municipality boundary lookup depends on OSM administrative relations carrying the expected name and `ISO3166-2=BR-<UF>` tag. A missing/ambiguous boundary or zero results is `inconclusive`; no fallback geocoder is called.
- OSM data coverage varies. This connector is for source review, not a determination that an entity is qualified or lacks a site.

