import { draftMode } from "next/headers";
import { RedirectType, redirect } from "next/navigation";

GET() {
	(await draftMode()).enable();
	redirect("/", RedirectType.replace);
}
