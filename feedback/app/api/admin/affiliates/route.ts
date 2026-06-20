import { NextRequest, NextResponse } from "next/server";
import {
  createAffiliateCode,
  deleteAffiliateCode,
  listAffiliateCodes,
  listAffiliateCommissions,
  markAffiliateCommissionPaid,
  updateAffiliateCode,
} from "@/lib/db/queries";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const provided = request.headers.get("x-admin-secret")?.trim();
  return provided === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [codes, commissions] = await Promise.all([
    listAffiliateCodes(),
    listAffiliateCommissions(),
  ]);
  return NextResponse.json({ codes, commissions });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    creatorName?: string;
    commissionType?: "percent" | "flat";
    commissionValue?: number;
  };

  if (
    !body.code ||
    !body.creatorName ||
    !body.commissionType ||
    body.commissionValue === undefined ||
    body.commissionValue <= 0
  ) {
    return NextResponse.json(
      { error: "code, creatorName, commissionType, and commissionValue (> 0) are required" },
      { status: 400 }
    );
  }

  try {
    const created = await createAffiliateCode({
      code: body.code.trim(),
      creatorName: body.creatorName.trim(),
      commissionType: body.commissionType,
      commissionValue: body.commissionValue,
    });
    return NextResponse.json({ code: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create code" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    commissionType?: "percent" | "flat";
    commissionValue?: number;
    active?: boolean;
    markCommissionPaidId?: string;
  };

  try {
    if (body.markCommissionPaidId) {
      await markAffiliateCommissionPaid(body.markCommissionPaidId);
      return NextResponse.json({ ok: true });
    }

    if (!body.code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const updated = await updateAffiliateCode(body.code.trim(), {
      commissionType: body.commissionType,
      commissionValue: body.commissionValue,
      active: body.active,
    });
    return NextResponse.json({ code: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    await deleteAffiliateCode(code.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete code" },
      { status: 400 }
    );
  }
}
