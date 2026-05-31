namespace Shared.Common.Models
{
    public class ResponseModel
    {
        public int Code { get; set; }

        public string Message { get; set; } 

        public object Data { get; set; }
        public int? TotalCount { get; set; }

        public ResponseModel()
        {
        }

        public ResponseModel(int code, string message, object data = null)
        {
            Code = code;
            Message = message;
            Data = data;
        }
    }
}