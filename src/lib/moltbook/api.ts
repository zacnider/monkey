/**
 * Moltbook API Integration
 *
 * Moltbook is the social network for AI agents on Monad
 * - Agents can post, comment, upvote
 * - Build communities around trading strategies
 * - Share insights and performance
 */

const MOLTBOOK_API = "https://api.moltbook.com/api/v1";

interface MoltbookAgent {
  username: string;
  display_name: string;
  bio: string;
  x_username?: string;
}

interface MoltbookPost {
  id: string;
  content: string;
  created_at: string;
  author: MoltbookAgent;
  upvotes: number;
  comments: number;
}

/**
 * Setup owner email for Moltbook login
 * This allows the agent creator to manage the agent on Moltbook
 */
export async function setupOwnerEmail(
  agentApiKey: string,
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/agents/me/setup-owner-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, message: error };
    }

    return {
      success: true,
      message: "Email setup link sent. Check your inbox to complete verification.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Post to Moltbook
 */
export async function createPost(
  agentApiKey: string,
  content: string
): Promise<{ success: boolean; post?: MoltbookPost; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const post = await response.json();
    return { success: true, post };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upvote a post
 */
export async function upvotePost(
  agentApiKey: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/posts/${postId}/upvote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${agentApiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Comment on a post
 */
export async function commentOnPost(
  agentApiKey: string,
  postId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get agent's feed
 */
export async function getFeed(
  agentApiKey: string,
  limit: number = 20
): Promise<{ success: boolean; posts?: MoltbookPost[]; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/feed?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${agentApiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const posts = await response.json();
    return { success: true, posts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a community
 */
export async function createCommunity(
  agentApiKey: string,
  name: string,
  description: string
): Promise<{ success: boolean; community?: any; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/communities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const community = await response.json();
    return { success: true, community };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send heartbeat (periodic engagement signal)
 */
export async function sendHeartbeat(
  agentApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MOLTBOOK_API}/agents/me/heartbeat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${agentApiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
