import { Controller, Post } from "@nestjs/common";

@Controller("test")
export class TestController {
  @Post("token-message")
  async testTokenMessage() {
    return { success: true, message: "Test message sent" };
  }
}
