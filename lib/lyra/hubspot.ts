/**
 * lib/lyra/hubspot.ts
 * HubSpot CRM integration for Lyra.
 * Handles contacts, deals, notes, tasks, and sequences.
 */

const HS_BASE = "https://api.hubapi.com";

function hsHeaders() {
  return {
    "Authorization": `Bearer ${process.env.HUBSPOT_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function hsGet(path: string): Promise<unknown> {
  const res = await fetch(`${HS_BASE}${path}`, {
    headers: hsHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HubSpot GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function hsPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${HS_BASE}${path}`, {
    method: "POST",
    headers: hsHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HubSpot POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function hsPatch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${HS_BASE}${path}`, {
    method: "PATCH",
    headers: hsHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HubSpot PATCH ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function searchContact(query: string): Promise<HsContact[]> {
  const data = await hsPost("/crm/v3/objects/contacts/search", {
    query,
    limit: 5,
    properties: ["firstname", "lastname", "email", "phone", "company", "hs_lead_status", "notes_last_updated"],
  }) as { results?: HsContact[] };
  return data.results ?? [];
}

export interface HsContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    hs_lead_status?: string;
    notes_last_updated?: string;
    [key: string]: string | undefined;
  };
}

export async function createContact(props: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
}): Promise<HsContact> {
  return await hsPost("/crm/v3/objects/contacts", {
    properties: {
      firstname: props.firstName,
      lastname: props.lastName ?? "",
      email: props.email ?? "",
      phone: props.phone ?? "",
      company: props.company ?? "",
    },
  }) as HsContact;
}

export async function updateContact(contactId: string, props: Record<string, string>): Promise<HsContact> {
  return await hsPatch(`/crm/v3/objects/contacts/${contactId}`, { properties: props }) as HsContact;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function logNote(contactId: string, note: string): Promise<void> {
  // Create engagement note
  const engagement = await hsPost("/engagements/v1/engagements", {
    engagement: {
      active: true,
      type: "NOTE",
      timestamp: Date.now(),
    },
    associations: {
      contactIds: [parseInt(contactId)],
    },
    metadata: {
      body: note,
    },
  });
  return void engagement;
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export interface HsDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    [key: string]: string | undefined;
  };
}

export async function getDeals(contactId: string): Promise<HsDeal[]> {
  const data = await hsGet(
    `/crm/v3/objects/contacts/${contactId}/associations/deals`
  ) as { results?: Array<{ id: string }> };

  const dealIds = (data.results ?? []).map((r) => r.id);
  if (dealIds.length === 0) return [];

  const deals = await Promise.allSettled(
    dealIds.map((id) => hsGet(`/crm/v3/objects/deals/${id}?properties=dealname,amount,dealstage,closedate`))
  );

  return deals
    .filter((r): r is PromiseFulfilledResult<HsDeal> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function createDeal(props: {
  name: string;
  amount?: string;
  stage?: string;
  contactId?: string;
}): Promise<HsDeal> {
  const deal = await hsPost("/crm/v3/objects/deals", {
    properties: {
      dealname: props.name,
      amount: props.amount ?? "",
      dealstage: props.stage ?? "appointmentscheduled",
      closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  }) as HsDeal;

  // Associate with contact if provided
  if (props.contactId) {
    try {
      await hsPost(`/crm/v4/objects/deals/${deal.id}/associations/contacts/${props.contactId}`, [
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }
      ]);
    } catch { /* association failure is non-fatal */ }
  }

  return deal;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function createTask(props: {
  title: string;
  notes?: string;
  dueDate?: string; // ISO date string
  contactId?: string;
}): Promise<void> {
  const dueDateMs = props.dueDate
    ? new Date(props.dueDate).getTime()
    : Date.now() + 7 * 24 * 60 * 60 * 1000;

  await hsPost("/engagements/v1/engagements", {
    engagement: {
      active: true,
      type: "TASK",
      timestamp: Date.now(),
    },
    associations: props.contactId ? { contactIds: [parseInt(props.contactId)] } : {},
    metadata: {
      body: props.notes ?? "",
      subject: props.title,
      status: "NOT_STARTED",
      taskType: "TODO",
      reminders: [dueDateMs],
    },
  });
}

// ── Contact summary ───────────────────────────────────────────────────────────

export async function getContactSummary(contactId: string): Promise<string> {
  try {
    const [contact, deals] = await Promise.allSettled([
      hsGet(`/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone,company,hs_lead_status,hs_email_last_open_date,num_contacted_notes`),
      getDeals(contactId),
    ]);

    const c = contact.status === "fulfilled" ? contact.value as HsContact : null;
    const d = deals.status === "fulfilled" ? deals.value : [];

    if (!c) return "Contact not found.";

    const p = c.properties;
    const name = [p.firstname, p.lastname].filter(Boolean).join(" ") || "Unknown";
    const dealSummary = d.length
      ? d.map((deal) => `  • ${deal.properties.dealname} — ${deal.properties.dealstage} ${deal.properties.amount ? `($${deal.properties.amount})` : ""}`).join("\n")
      : "  No open deals";

    return [
      `**${name}** at ${p.company ?? "Unknown Company"}`,
      `Email: ${p.email ?? "—"} | Phone: ${p.phone ?? "—"}`,
      `Status: ${p.hs_lead_status ?? "—"}`,
      `\nDeals:\n${dealSummary}`,
    ].join("\n");
  } catch (e) {
    return `Error fetching contact: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── Natural language dispatcher ───────────────────────────────────────────────

export interface HsAction {
  action: "search" | "create_contact" | "log_note" | "create_deal" | "create_task" | "get_summary" | "update_contact";
  contactName?: string;
  contactId?: string;
  email?: string;
  phone?: string;
  company?: string;
  note?: string;
  dealName?: string;
  dealAmount?: string;
  dealStage?: string;
  taskTitle?: string;
  taskDue?: string;
  field?: string;
  value?: string;
  query?: string;
}

export async function executeHsAction(action: HsAction): Promise<string> {
  try {
    switch (action.action) {
      case "search": {
        const contacts = await searchContact(action.query ?? action.contactName ?? "");
        if (contacts.length === 0) return "No contacts found matching that name.";
        return contacts.map((c) => {
          const p = c.properties;
          return `• **${p.firstname ?? ""} ${p.lastname ?? ""}** (${p.company ?? "—"}) — ${p.email ?? "no email"} | Status: ${p.hs_lead_status ?? "—"} | ID: ${c.id}`;
        }).join("\n");
      }

      case "create_contact": {
        const [firstName, ...rest] = (action.contactName ?? "New Contact").split(" ");
        const contact = await createContact({
          firstName,
          lastName: rest.join(" "),
          email: action.email,
          phone: action.phone,
          company: action.company,
        });
        return `✅ Contact created: **${contact.properties.firstname} ${contact.properties.lastname ?? ""}** (ID: ${contact.id})`;
      }

      case "log_note": {
        if (!action.contactId) return "Need a contact ID to log a note. Search for the contact first.";
        await logNote(action.contactId, action.note ?? "");
        return `✅ Note logged for contact ${action.contactId}: "${action.note}"`;
      }

      case "create_deal": {
        const deal = await createDeal({
          name: action.dealName ?? "New Deal",
          amount: action.dealAmount,
          stage: action.dealStage,
          contactId: action.contactId,
        });
        return `✅ Deal created: **${deal.properties.dealname}** — Stage: ${deal.properties.dealstage} (ID: ${deal.id})`;
      }

      case "create_task": {
        await createTask({
          title: action.taskTitle ?? "Follow up",
          contactId: action.contactId,
          dueDate: action.taskDue,
        });
        return `✅ Task created: "${action.taskTitle}" ${action.taskDue ? `due ${action.taskDue}` : "due in 7 days"}`;
      }

      case "get_summary": {
        if (!action.contactId) return "Need a contact ID. Search for the contact first.";
        return await getContactSummary(action.contactId);
      }

      case "update_contact": {
        if (!action.contactId || !action.field) return "Need contact ID and field to update.";
        await updateContact(action.contactId, { [action.field]: action.value ?? "" });
        return `✅ Updated ${action.field} for contact ${action.contactId}`;
      }

      default:
        return "Unknown HubSpot action.";
    }
  } catch (e) {
    return `HubSpot error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
