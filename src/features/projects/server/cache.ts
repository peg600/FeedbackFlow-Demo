import { revalidatePath } from "next/cache";

/**
 * 失效公开项目的看板与路线图缓存；项目级更新会连同全部详情页失效，
 * 单条反馈更新则只刷新对应详情，避免投票时清空整个详情页缓存树。
 */
export function revalidatePublicProjectPages(
  slug: string,
  feedbackId?: string,
) {
  const boardPath = `/p/${slug}`;

  if (!feedbackId) {
    revalidatePath(boardPath, "layout");
    return;
  }

  revalidatePath(boardPath);
  revalidatePath(`${boardPath}/roadmap`);
  revalidatePath(`${boardPath}/feedback/${feedbackId}`);
}
