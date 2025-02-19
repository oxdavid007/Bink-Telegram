import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";

@Injectable()
export class AiService implements OnApplicationBootstrap {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("openai.apiKey"),
    });
  }

  async onApplicationBootstrap() {}

  async createChatCompletion(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ) {
    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      });

      return {
        success: true,
        content: completion.choices[0]?.message?.content || "",
        usage: completion.usage,
      };
    } catch (error) {
      console.error("Error in chat completion:", error);
      return {
        success: false,
        error: error.message || "Failed to generate chat completion",
      };
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();
    let fullText = "";

    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullText += content;
          eventEmitter.emit("data", content);
        }
      }

      eventEmitter.emit("end", fullText);
      return eventEmitter;
    } catch (error) {
      console.error("Error in stream chat completion:", error);
      eventEmitter.emit("error", error);
      throw error;
    }
  }

  // Helper method to consume stream with async iterator
  async *generateStreamResponse(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ) {
    try {
      const stream = await this.openai.chat.completions.create({
        messages,
        model: options.model || "gpt-3.5-turbo",
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("Error in generate stream response:", error);
      throw error;
    }
  }
}
